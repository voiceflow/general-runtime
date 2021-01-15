import { PrototypeModel } from '@voiceflow/api-sdk';
import { GeneralTrace, IntentRequest, TraceType } from '@voiceflow/general-types';
import _ from 'lodash';

import logger from '@/logger';
import { Context, ContextHandler } from '@/types';

import { generateVariations } from '../chips/utils';
import { handleNLCDialog } from '../nlu/nlc';
import { getNoneIntentRequest } from '../nlu/utils';
import { isIntentRequest } from '../runtime/types';
import { AbstractManager, injectServices } from '../utils';
import { dmPrefix, fillStringEntities, getDMPrefixIntentName, getIntentEntityList, getUnfulfilledEntity, VF_DM_PREFIX } from './utils';

export const utils = {};

declare type DMStore = {
  intentRequest?: IntentRequest;
};

@injectServices({ utils })
class DialogManagement extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  static setDMStore(context: Context, store: DMStore | undefined) {
    return { ...context, state: { ...context.state, storage: { ...context.state.storage, dm: store } } };
  }

  handleDMContext = (dmStateStore: DMStore, dmPrefixedResult: IntentRequest, incomingRequest: IntentRequest, languageModel: PrototypeModel) => {
    const dmPrefixedResultName = dmPrefixedResult.payload.intent.name;
    logger.trace(`@DM - DM-Prefixed inference result: ${dmPrefixedResultName}`);

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
        dmPrefixedResult.payload.entities.map((entity) => {
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

    const version = await this.services.dataAPI.getVersion(context.versionID);

    if (!version) {
      throw new Error('Version not found!');
    }

    if (!version.prototype?.model) {
      throw new Error('Model not found!');
    }

    const incomingRequest = context.request;
    const dmStateStore: DMStore = { ...context.state.storage.dm };

    if (dmStateStore?.intentRequest) {
      logger.debug('@DM - In dialog management context');

      const dmPrefixedResult = await this.services.nlu.predict({
        query: `${dmPrefix(dmStateStore.intentRequest.payload.intent.name)} ${incomingRequest.payload.query}`,
        model: version.prototype.model,
        projectID: version.projectID,
        dmIntent: dmStateStore.intentRequest,
      });

      const isFallback = this.handleDMContext(dmStateStore, dmPrefixedResult, incomingRequest, version.prototype.model);

      if (isFallback) {
        return {
          ...DialogManagement.setDMStore(context, undefined),
          request: getNoneIntentRequest(context.request?.payload?.query),
        };
      }
    } else {
      logger.debug('@DM - In regular context');
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
      const trace: GeneralTrace[] = [];

      trace.push({
        type: TraceType.SPEAK,
        payload: {
          message: fillStringEntities(_.sample(unfulfilledEntity.dialog.prompt)!.text, dmStateStore!.intentRequest),
        },
      });

      if (version.prototype?.model) {
        trace.push({
          type: TraceType.CHOICE,
          payload: {
            choices: generateVariations(unfulfilledEntity.dialog.utterances, version.prototype.model),
          },
        });
      }

      return {
        ...context,
        end: true,
        trace,
      };
    }

    // No more unfulfilled required entities -> populate the request object with the final intent and extracted entities from the DM state store
    context.request = dmStateStore!.intentRequest;

    // Clear the DM state store
    return DialogManagement.setDMStore(context, undefined);
  };
}

export default DialogManagement;
