import type { Prediction } from '@azure/cognitiveservices-luis-runtime/src/models/index';

import { Context, ContextHandler } from '@/types';

import { AbstractManager, injectServices } from '../utils';

export const utils = {};

@injectServices({ utils })
class NLU extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  // TODO: implement NLU handler
  handle = async (context: Context) => {
    const version = await this.services.dataAPI.getVersion(context.versionID);

    if (!version) {
      throw new Error();
    }

    try {
      const { data } = await this.services.axios.post<{ query: string } & Pick<Prediction, 'intents' | 'topIntent' | 'entities'>>(
        `${this.config.GENERAL_SERVICE_ENDPOINT}/runtime/${version.projectID}/predict`,
        {
          query: (context.request as any).payload, // TODO: request should be TextRequest type
        }
      );

      return {
        ...context,
        request: {
          // type: RequestType.INTENT,
          payload: data
        },
      };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      throw err;
    }
  };
}

export default NLU;
