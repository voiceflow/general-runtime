/**
 * [[include:dialog.md]]
 * @packageDocumentation
 */

import { PrototypeModel } from '@voiceflow/api-sdk';
import { Request, Trace } from '@voiceflow/base-types';
import { Types as ChatTypes } from '@voiceflow/chat-types';
import { Constants } from '@voiceflow/general-types';
import { Types as VoiceTypes } from '@voiceflow/voice-types';
import _ from 'lodash';

import log from '@/logger';
import { Context, ContextHandler } from '@/types';

import { handleNLCDialog } from '../nlu/nlc';
import { getNoneIntentRequest, NONE_INTENT } from '../nlu/utils';
import { isIntentRequest } from '../runtime/types';
import { outputTrace } from '../runtime/utils';
import { AbstractManager, injectServices } from '../utils';
import { rectifyEntityValue } from './synonym';
import {
  dmPrefix,
  fillStringEntities,
  getDMPrefixIntentName,
  getEntitiesMap,
  getIntentEntityList,
  getUnfulfilledEntity,
  inputToString,
  isIntentInScope,
  VF_DM_PREFIX,
} from './utils';

export const utils = {
  outputTrace,
  isIntentInScope,
};

declare type DMStore = {
  intentRequest?: Request.IntentRequest;
};

@injectServices({ utils })
class DialogManagement extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  static setDMStore(context: Context, store: DMStore | undefined) {
    return { ...context, state: { ...context.state, storage: { ...context.state.storage, dm: store } } };
  }

  handleDMContext = (
    dmStateStore: DMStore,
    dmPrefixedResult: Request.IntentRequest,
    incomingRequest: Request.IntentRequest,
    languageModel: PrototypeModel
  ) => {
    const dmPrefixedResultName = dmPrefixedResult.payload.intent.name;
    log.trace(`[app] [runtime] [dm] DM-Prefixed inference result ${log.vars({ resultName: dmPrefixedResultName })}`);

    if (dmPrefixedResultName.startsWith(VF_DM_PREFIX)) {
      // Remove hash prefix entity from the DM-prefixed result
      dmPrefixedResult.payload.entities = dmPrefixedResult.payload.entities.filter((entity) => !entity.name.startsWith(VF_DM_PREFIX));

      const expectedDMPrefixIntentName = getDMPrefixIntentName(dmStateStore.intentRequest!.payload.intent.name);
      const intentEntityList = getIntentEntityList(dmStateStore.intentRequest!.payload.intent.name, languageModel);
      // Check if the dmPrefixedResult entities are a subset of the intent's entity list
      const isEntitySubset = dmPrefixedResult.payload.entities.some((dmEntity) => intentEntityList?.find((entity) => entity?.name === dmEntity.name));
      if (expectedDMPrefixIntentName === dmPrefixedResultName || isEntitySubset) {
        // CASE-B1 || CASE-B2_4: The prefixed and regular calls match the same intent OR
        //                       the prefixed intent only contains entities that are in the target intent's entity list
        // Action: Use the entities extracted from the prefixed intent to overwrite any existing filled entities
        dmPrefixedResult.payload.entities.forEach((entity) => {
          const storedEntity = dmStateStore.intentRequest!.payload.entities.find((stored) => stored.name === entity.name);
          if (!storedEntity) {
            dmStateStore.intentRequest!.payload.entities.push(entity); // Append entity
          } else {
            storedEntity.value = entity.value; // Update entity value
          }
        });
        // TODO: Confidence-based selection of whether to switch intents
      } else if (dmPrefixedResult.payload.entities.length === 0) {
        // CASE-B2_2: The prefixed intent has no entities extracted (except for the hash sentinel)
        // Action:  Migrate the user to the regular intent
        dmStateStore.intentRequest = incomingRequest;
      } else {
        // (Unlikely) CASE-B2_3: The prefixed intent has entities that are not in the target intent's entity list
        // Action: return true; Fallback intent
        return true;
      }
    } else if (dmPrefixedResultName === incomingRequest.payload.intent.name) {
      // CASE-A1: The prefixed and regular calls match the same (non-DM) intent that is different from the original intent
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

  handle = async (context: Context) => {
    if (!isIntentRequest(context.request)) {
      return context;
    }

    const version = await context.data.api.getVersion(context.versionID);

    if (!version) {
      throw new Error('Version not found!');
    }

    if (!version.prototype?.model) {
      throw new Error('Model not found!');
    }

    const incomingRequest = context.request;
    const dmStateStore: DMStore = { ...context.state.storage.dm };

    if (dmStateStore?.intentRequest) {
      log.debug('[app] [runtime] [dm] in dialog management context');

      const { query } = incomingRequest.payload;

      try {
        const prefix = dmPrefix(dmStateStore.intentRequest.payload.intent.name);
        const dmPrefixedResult = await this.services.nlu.predict({
          query: `${prefix} ${query}`,
          projectID: version.projectID,
        });

        // Remove the dmPrefix from entity values that it has accidentally been attached to
        dmPrefixedResult.payload.entities.forEach((entity) => {
          entity.value = _.isString(entity.value) ? entity.value.replace(prefix, '').trim() : entity.value;
        });

        const isFallback = this.handleDMContext(dmStateStore, dmPrefixedResult, incomingRequest, version.prototype.model);

        if (isFallback) {
          return {
            ...DialogManagement.setDMStore(context, undefined),
            request: getNoneIntentRequest(query),
          };
        }
      } catch (err) {
        const resultNLC = handleNLCDialog({
          query,
          model: version.prototype.model,
          locale: version.prototype.data!.locales[0] as Constants.Locale,
          dmRequest: dmStateStore.intentRequest,
        });

        if (resultNLC.payload.intent.name === NONE_INTENT) {
          return {
            ...DialogManagement.setDMStore(context, undefined),
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
      const trace: Trace.AnyTrace[] = [];

      const prompt = _.sample(unfulfilledEntity.dialog.prompt)! as ChatTypes.Prompt | VoiceTypes.IntentPrompt<string>;
      const variables = getEntitiesMap(dmStateStore!.intentRequest);

      const output =
        'content' in prompt
          ? prompt.content
          : fillStringEntities(inputToString(prompt, version.platformData.settings.defaultVoice), dmStateStore!.intentRequest);

      trace.push(outputTrace({ output, variables }));

      return {
        ...context,
        end: true,
        trace,
      };
    }

    // No more unfulfilled required entities -> populate the request object with the final intent and extracted entities from the DM state store
    context.request = rectifyEntityValue(dmStateStore!.intentRequest, version.prototype.model);

    // Clear the DM state store
    return DialogManagement.setDMStore(context, undefined);
  };
}

export default DialogManagement;
