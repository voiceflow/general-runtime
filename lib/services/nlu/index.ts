import { PrototypeModel } from '@voiceflow/api-sdk';
import { IntentRequest, RequestType } from '@voiceflow/general-types';

import { Context, ContextHandler } from '@/types';

import { AbstractManager, injectServices } from '../utils';
import { handleNLCCommand } from './nlc';

export const utils = {};

export const EMPTY_INTENT = '_empty';

@injectServices({ utils })
class NLU extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  static getEmptyIntentRequest(): IntentRequest {
    return {
      type: RequestType.INTENT,
      payload: {
        query: '',
        intent: { name: EMPTY_INTENT },
        entities: [],
      },
    };
  }

  async predict({ query, model, nlcQuery = query, projectID }: { query: string; model?: PrototypeModel; nlcQuery?: string; projectID: string }) {
    try {
      const { data } = await this.services.axios.post<IntentRequest>(`${this.config.GENERAL_SERVICE_ENDPOINT}/runtime/${projectID}/predict`, {
        query,
      });

      return data;
    } catch (err) {
      if (!model) {
        throw new Error('Model not found!');
      }

      const request = await handleNLCCommand(nlcQuery, model);

      return request || NLU.getEmptyIntentRequest();
    }
  }

  handle = async (context: Context) => {
    if (context.request?.type !== RequestType.TEXT) {
      return context;
    }

    // empty string input - we can also consider return request: null as well (this won't advance the conversation)
    if (!context.request.payload) {
      return {
        ...context,
        request: NLU.getEmptyIntentRequest(),
      };
    }

    const version = await context.data.api.getVersion(context.versionID);

    if (!version) {
      throw new Error('Version not found!');
    }

    const request = await this.predict({ query: context.request.payload, model: version.prototype?.model, projectID: version.projectID });

    return { ...context, request };
  };
}

export default NLU;
