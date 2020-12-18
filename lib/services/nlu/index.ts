import { Prediction } from '@azure/cognitiveservices-luis-runtime/src/models/index';
import { IntentRequest, RequestType } from '@voiceflow/general-types';

import { Context, ContextHandler } from '@/types';

import { AbstractManager, injectServices } from '../utils';

export const utils = {};

@injectServices({ utils })
class NLU extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  // TODO: implement NLU handler
  handle = async (context: Context) => {
    if (typeof context.request.payload !== 'string') {
      return context;
    }

    const version = await this.services.dataAPI.getVersion(context.versionID);

    if (!version) {
      throw new Error();
    }

    try {
      const { data } = await this.services.axios.post<{ query: string } & Pick<Prediction, 'intents' | 'topIntent' | 'entities'>>(
        `${this.config.GENERAL_SERVICE_ENDPOINT}/runtime/${version.projectID}/predict`,
        { query: context.request.payload }
      );

      const intentRequest: IntentRequest = {
        type: RequestType.INTENT,
        payload: {
          query: context.request.payload,
          slots: Object.values(data.entities), // TODO: figure out LUIS entities typ and add adapters
          intent: { name: data.topIntent },
        },
      };

      return { ...context, request: intentRequest };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      throw err;
    }
  };
}

export default NLU;
