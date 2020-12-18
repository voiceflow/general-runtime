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
      const intent = await this.services.axios.get(`${this.config.GENERAL_SERVICE_ENDPOINT}/runtime/${version.projectID}/predict`, {
        query: context.request.payload.text,
      });

      return {
        ...context,
        request: {
          // type: RequestType.INTENT,
          // payload: {}
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
