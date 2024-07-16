/**
 * [[include:dialog.md]]
 * @packageDocumentation
 */

import { BaseModels, BaseNode, BaseRequest, BaseTrace, RuntimeLogs } from '@voiceflow/base-types';
import { ChatModels } from '@voiceflow/chat-types';
import { VF_DM_PREFIX } from '@voiceflow/common';
import VError from '@voiceflow/verror';
import { VoiceModels } from '@voiceflow/voice-types';
import { VoiceflowConstants, VoiceflowUtils, VoiceflowVersion } from '@voiceflow/voiceflow-types';
import _ from 'lodash';

import { hasElicit, setElicit } from '@/lib/services/runtime/handlers/utils/entity';
import { inputToString } from '@/lib/services/runtime/handlers/utils/output';
import log from '@/logger';
import { Store } from '@/runtime';
import DebugLogging from '@/runtime/lib/Runtime/DebugLogging';
import { Context, ContextHandler, VersionTag } from '@/types';

import { Predictor } from '../classification';
import { castToDTO } from '../classification/classification.utils';
import { getIntentRequest } from '../nlu';
import { getNoneIntentRequest, isUsedIntent } from '../nlu/utils';
import { isIntentRequest, StorageType } from '../runtime/types';
import { addOutputTrace, getOutputTrace } from '../runtime/utils';
import { AbstractManager, injectServices } from '../utils';
import { rectifyEntityValue } from './synonym';
import {
  dmPrefix,
  fillStringEntities,
  getEntitiesMap,
  getIntentEntityList,
  getUnfulfilledEntity,
  isIntentInScope,
} from './utils';

export const utils = {
  addOutputTrace,
  getOutputTrace,
  isIntentInScope,
};

export interface DMStore {
  intentRequest?: BaseRequest.IntentRequest;
  priorIntent?: BaseRequest.IntentRequest;
}

@injectServices({ utils })
class DialogManagement extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  static setDMStore(context: Context, store: DMStore | undefined) {
    return {
      ...context,
      state: {
        ...context.state,
        storage: { ...context.state.storage, [StorageType.DM]: store },
      },
    };
  }

  handleDMContext = (
    dmStateStore: DMStore,
    dmPrefixedResult: BaseRequest.IntentRequest,
    incomingRequest: BaseRequest.IntentRequest,
    languageModel: BaseModels.PrototypeModel
  ): void => {
    const dmPrefixedResultName = dmPrefixedResult.payload.intent.name;
    const incomingRequestName = incomingRequest.payload.intent.name;
    const expectedIntentName = dmStateStore.intentRequest!.payload.intent.name;

    log.trace(`[app] [runtime] [dm] DM-Prefixed inference result ${log.vars({ resultName: dmPrefixedResultName })}`);

    if (dmPrefixedResultName.startsWith(VF_DM_PREFIX) || dmPrefixedResultName === expectedIntentName) {
      // Remove hash prefix entity from the DM-prefixed result
      dmPrefixedResult.payload.entities = dmPrefixedResult.payload.entities.filter(
        (entity) => !entity.name.startsWith(VF_DM_PREFIX)
      );
      const intentEntityList = getIntentEntityList(expectedIntentName, languageModel);
      // Check if the dmPrefixedResult entities are a subset of the intent's entity list
      const entitySubset = dmPrefixedResult.payload.entities.filter((dmEntity) =>
        intentEntityList?.find((entity) => entity?.name === dmEntity.name)
      );
      if (entitySubset.length) {
        // CASE-B1: the prefixed intent only contains entities that are in the target intent's entity list
        // Action: Use the entities extracted from the prefixed intent to overwrite any existing filled entities
        entitySubset.forEach((entity) => {
          const storedEntity = dmStateStore.intentRequest!.payload.entities.find(
            (stored) => stored.name === entity.name
          );
          if (!storedEntity) {
            dmStateStore.intentRequest!.payload.entities.push(entity); // Append entity
          } else {
            storedEntity.value = entity.value; // Update entity value
          }
        });
      } else {
        // CASE-B2_2: The prefixed intent has no entities extracted (except for the hash sentinel)
        // Action:  Migrate the user to the regular intent
        dmStateStore.intentRequest = incomingRequest;
      }
    } else if (dmPrefixedResultName === incomingRequestName) {
      // CASE-A1: The prefixed and regular calls match the same (non-DM) intent
      // that is different from the original intent
      // Action: Migrate user to the new intent and extract all the available entities
      dmStateStore.intentRequest = incomingRequest;
    } else {
      // CASE-A2: The prefixed and regular calls do not match the same intent
      dmStateStore.intentRequest = getNoneIntentRequest({
        query: incomingRequest.payload.query,
      });
    }
  };

  private isNluGatwayEndpointConfigured() {
    return this.config.NLU_GATEWAY_SERVICE_URI && this.config.NLU_GATEWAY_SERVICE_PORT_APP;
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  handle = async (context: Context) => {
    if (!isIntentRequest(context.request)) {
      return context;
    }

    const version = await context.data.api.getVersion(context.versionID);

    if (!version.prototype?.model) {
      throw new VError('Model not found. Ensure project is properly rendered.');
    }

    const project = await context.data.api.getProject(version.projectID);

    const incomingRequest = context.request;
    const currentStore = context.state.storage[StorageType.DM];
    const dmStateStore: DMStore = {
      ...currentStore,
      priorIntent: currentStore?.intentRequest,
    };
    const { query } = incomingRequest.payload;

    // when capturing multiple intents on alexa, the currentStore.payload.entities only has the latest entity
    // not the previous ones, we need to add them here since the dfes request has all
    incomingRequest.payload.entities.forEach((requestEntity) => {
      const dmRequestHasEntity = dmStateStore.intentRequest?.payload.entities.find(
        (storeEntity) => requestEntity.name === storeEntity.name
      );
      if (!dmRequestHasEntity) {
        dmStateStore.intentRequest?.payload.entities.push(requestEntity);
      }
    });

    // if there is an existing entity filling request
    // AND there are slots to be filled, call predict
    if (dmStateStore?.intentRequest && getUnfulfilledEntity(dmStateStore.intentRequest, version.prototype.model)) {
      log.debug('[app] [runtime] [dm] in entity filling context');

      try {
        const prefix = dmPrefix(dmStateStore.intentRequest.payload.intent.name);
        const { intentClassificationSettings, intents, isTrained, slots } = castToDTO(version, project);

        let dmPrefixedResult = incomingRequest;

        if (this.isNluGatwayEndpointConfigured()) {
          const predictor = new Predictor(
            {
              axios: this.services.axios,
              mlGateway: this.services.mlGateway,
              CLOUD_ENV: this.config.CLOUD_ENV,
              NLU_GATEWAY_SERVICE_URI: this.config.NLU_GATEWAY_SERVICE_URI,
              NLU_GATEWAY_SERVICE_PORT_APP: this.config.NLU_GATEWAY_SERVICE_PORT_APP,
            },
            {
              workspaceID: project.teamID,
              versionID: context.versionID,
              tag: project.liveVersion === context.versionID ? VersionTag.PRODUCTION : VersionTag.DEVELOPMENT,
              intents: intents ?? [],
              slots: slots ?? [],
              dmRequest: dmStateStore.intentRequest.payload,
              isTrained,
            },
            intentClassificationSettings,
            {
              locale: version.prototype?.data.locales[0] as VoiceflowConstants.Locale,
              hasChannelIntents: project?.platformData?.hasChannelIntents,
              platform: version.prototype.platform as VoiceflowConstants.PlatformType,
            }
          );

          const prediction = await predictor.predict(`${prefix} ${query}`);

          // LATER: look into using the `filteredIntents` field in the Predictor class instead
          dmPrefixedResult =
            prediction && isUsedIntent(version.prototype?.surveyorContext?.usedIntentsSet, prediction.predictedIntent)
              ? getIntentRequest(prediction)
              : getNoneIntentRequest(prediction ?? { query });
        }

        // Remove the dmPrefix from entity values that it has accidentally been attached to
        dmPrefixedResult.payload.entities.forEach((entity) => {
          entity.value = typeof entity.value === 'string' ? entity.value.replace(prefix, '').trim() : entity.value;
        });

        this.handleDMContext(dmStateStore, dmPrefixedResult, incomingRequest, version.prototype.model);

        if (dmStateStore.intentRequest.payload.intent.name === VoiceflowConstants.IntentName.NONE) {
          return {
            ...DialogManagement.setDMStore(context, {
              ...dmStateStore,
              intentRequest: undefined,
            }),
            request: getNoneIntentRequest({ query }),
          };
        }
      } catch (err) {
        // if something happens just say the intent is the initially resolved intent
        dmStateStore.intentRequest = incomingRequest;
      }
    } else if (!dmStateStore?.intentRequest) {
      log.debug('[app] [runtime] [dm] in regular context');

      if (!(await this.services.utils.isIntentInScope(context))) {
        return context;
      }

      // Since we are in the regular context, we just set the intentRequest object in the DM state store as-is.
      // The downstream code will decide if further DM processing is needed.
      dmStateStore.intentRequest = incomingRequest;
    }

    // Set the DM state store without modifying the source context
    context = DialogManagement.setDMStore(context, dmStateStore);

    // Are there any unfulfilled required entities?
    // We need to use the stored DM state here to ensure that previously fulfilled entities are also considered!
    const unfulfilledEntity = getUnfulfilledEntity(dmStateStore!.intentRequest, version.prototype.model);

    if (unfulfilledEntity) {
      // There are unfulfilled required entities -> return dialog management prompt
      // Assemble return string by populating the inline entity values
      const trace: BaseTrace.AnyTrace[] = context.trace ? [...context.trace] : [];

      const prompt = _.sample(unfulfilledEntity.dialog.prompt)! as
        | ChatModels.Prompt
        | VoiceModels.IntentPrompt<VoiceflowConstants.Voice>;

      const addTrace = (traceFrame: BaseNode.Utils.BaseTraceFrame): void => {
        trace.push(traceFrame as any);
      };
      const debugLogging = new DebugLogging(addTrace);
      debugLogging.refreshContext(context);

      if (!hasElicit(incomingRequest) && prompt) {
        const variables = new Store(getEntitiesMap(dmStateStore!.intentRequest));

        const output = VoiceflowUtils.prompt.isIntentVoicePrompt(prompt)
          ? fillStringEntities(
              dmStateStore!.intentRequest,
              inputToString(prompt, (version as VoiceflowVersion.VoiceVersion).platformData.settings.defaultVoice)
            )
          : prompt.content;

        const variableStore = new Store(context.state.variables);
        utils.addOutputTrace(
          { trace: { addTrace }, debugLogging },
          // isPrompt is useful for adapters where we give the control of the capture to the NLU (like alexa)
          // this way the adapter can ignore this prompt trace because the NLU will take care of it
          utils.getOutputTrace({
            output,
            version,
            variables,
            isPrompt: true,
          }),
          { variables: variableStore }
        );
        context.state.variables = variableStore.getState();
      }
      if (prompt || hasElicit(incomingRequest)) {
        trace.push({
          type: BaseTrace.TraceType.ENTITY_FILLING,
          payload: {
            entityToFill: unfulfilledEntity.name,
            intent: dmStateStore.intentRequest,
          },
          time: Date.now(),
        });

        debugLogging.recordGlobalLog(RuntimeLogs.Kinds.GlobalLogKind.NLU_INTENT_RESOLVED, {
          confidence: dmStateStore.intentRequest.payload.confidence ?? 1,
          resolvedIntent: dmStateStore.intentRequest.payload.intent.name,
          utterance: dmStateStore.intentRequest.payload.query,
          entities: Object.fromEntries(
            dmStateStore.intentRequest.payload.entities.map((entity) => [entity.name, { value: entity.value }])
          ),
        });
        return {
          ...context,
          end: true,
          trace,
        };
      }
      return {
        ...DialogManagement.setDMStore(context, {
          ...dmStateStore,
          intentRequest: undefined,
        }),
        request: getNoneIntentRequest({ query }),
      };
    }

    // No more unfulfilled required entities -> populate the request object with
    // the final intent and extracted entities from the DM state store
    let intentRequest = rectifyEntityValue(dmStateStore!.intentRequest, version.prototype.model);

    // to show correct query in the transcripts
    intentRequest.payload.query = query;

    if (!unfulfilledEntity) {
      // removing elicit from the request to show the last intent in the transcript
      intentRequest = setElicit(intentRequest, false);
    }

    context.request = intentRequest;

    // Clear the DM state store
    return DialogManagement.setDMStore(context, undefined);
  };
}

export default DialogManagement;
