/**
 * [[include:dialog.md]]
 * @packageDocumentation
 */

import { BaseModels, BaseRequest, BaseTrace } from '@voiceflow/base-types';
import { ChatModels } from '@voiceflow/chat-types';
import { VF_DM_PREFIX } from '@voiceflow/common';
import VError from '@voiceflow/verror';
import { VoiceModels } from '@voiceflow/voice-types';
import { VoiceflowConstants, VoiceflowUtils, VoiceflowVersion } from '@voiceflow/voiceflow-types';
import _ from 'lodash';

import { hasElicit, setElicit } from '@/lib/services/runtime/handlers/utils/entity';
import log from '@/logger';
import { Context, ContextHandler, VersionTag } from '@/types';

import { handleNLCDialog } from '../nlu/nlc';
import { getNoneIntentRequest, NONE_INTENT } from '../nlu/utils';
import { isIntentRequest, StorageType } from '../runtime/types';
import { outputTrace } from '../runtime/utils';
import { AbstractManager, injectServices } from '../utils';
import { rectifyEntityValue } from './synonym';
import {
  dmPrefix,
  fillStringEntities,
  getEntitiesMap,
  getIntentEntityList,
  getUnfulfilledEntity,
  inputToString,
  isIntentInScope,
} from './utils';

export const utils = {
  outputTrace,
  isIntentInScope,
};

export interface DMStore {
  intentRequest?: BaseRequest.IntentRequest;
  priorIntent?: BaseRequest.IntentRequest;
}

@injectServices({ utils })
class DialogManagement extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  static setDMStore(context: Context, store: DMStore | undefined) {
    return { ...context, state: { ...context.state, storage: { ...context.state.storage, [StorageType.DM]: store } } };
  }

  handleDMContext = (
    dmStateStore: DMStore,
    dmPrefixedResult: BaseRequest.IntentRequest,
    incomingRequest: BaseRequest.IntentRequest,
    languageModel: BaseModels.PrototypeModel
  ): boolean => {
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
      // (Unlikely) CASE-A2: The prefixed and regular calls do not match the same intent
      // Action: return true; Fallback intent
      return true;
    }

    // Fallback intent is not needed here
    return false;
  };

  // eslint-disable-next-line sonarjs/cognitive-complexity
  handle = async (context: Context) => {
    if (!isIntentRequest(context.request)) {
      return context;
    }

    const version = await context.data.api.getVersion(context.versionID);

    if (!version.prototype?.model) {
      throw new VError('Model not found');
    }

    const project = await context.data.api.getProjectNLP(version.projectID);

    const incomingRequest = context.request;
    const currentStore = context.state.storage[StorageType.DM];
    const dmStateStore: DMStore = { ...currentStore, priorIntent: currentStore?.intentRequest };
    const { query } = incomingRequest.payload;

    // if there is an existing entity filling request
    if (dmStateStore?.intentRequest) {
      log.debug('[app] [runtime] [dm] in entity filling context');

      try {
        const prefix = dmPrefix(dmStateStore.intentRequest.payload.intent.name);
        const dmPrefixedResult = this.config.LUIS_SERVICE_ENDPOINT
          ? await this.services.nlu.predict({
              query: `${prefix} ${query}`,
              projectID: version.projectID,
              versionID: context.versionID,
              model: version.prototype?.model,
              locale: version.prototype?.data.locales[0] as VoiceflowConstants.Locale,
              tag: project.liveVersion === context.versionID ? VersionTag.PRODUCTION : VersionTag.DEVELOPMENT,
              nlp: project.nlp,
            })
          : incomingRequest;

        // Remove the dmPrefix from entity values that it has accidentally been attached to
        dmPrefixedResult.payload.entities.forEach((entity) => {
          entity.value = typeof entity.value === 'string' ? entity.value.replace(prefix, '').trim() : entity.value;
        });

        const isFallback = this.handleDMContext(
          dmStateStore,
          dmPrefixedResult,
          incomingRequest,
          version.prototype.model
        );

        if (isFallback) {
          return {
            ...DialogManagement.setDMStore(context, { ...dmStateStore, intentRequest: undefined }),
            request: getNoneIntentRequest(query),
          };
        }
      } catch (err) {
        const resultNLC = handleNLCDialog({
          query,
          model: version.prototype.model,
          locale: version.prototype.data!.locales[0] as VoiceflowConstants.Locale,
          dmRequest: dmStateStore.intentRequest,
        });

        if (resultNLC.payload.intent.name === NONE_INTENT) {
          return {
            ...DialogManagement.setDMStore(context, { ...dmStateStore, intentRequest: undefined }),
            request: getNoneIntentRequest(query),
          };
        }

        dmStateStore.intentRequest = resultNLC;
      }
    } else {
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
      const trace: BaseTrace.AnyTrace[] = [];

      const prompt = _.sample(unfulfilledEntity.dialog.prompt)! as
        | ChatModels.Prompt
        | VoiceModels.IntentPrompt<VoiceflowConstants.Voice>;

      if (!hasElicit(incomingRequest) && prompt) {
        const variables = getEntitiesMap(dmStateStore!.intentRequest);

        const output = VoiceflowUtils.prompt.isIntentVoicePrompt(prompt)
          ? fillStringEntities(
              dmStateStore!.intentRequest,
              inputToString(prompt, (version as VoiceflowVersion.VoiceVersion).platformData.settings.defaultVoice)
            )
          : prompt.content;

        trace.push(outputTrace({ output, variables }));
      }
      trace.push({
        type: BaseTrace.TraceType.ENTITY_FILLING,
        payload: {
          entityToFill: unfulfilledEntity.name,
          intent: dmStateStore.intentRequest,
        },
      });

      return {
        ...context,
        end: true,
        trace,
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
