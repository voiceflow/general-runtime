/**
 * [[include:nlu.md]]
 * @packageDocumentation
 */

import { PrototypeModel } from '@voiceflow/api-sdk';
import { IntentRequest, Locale } from '@voiceflow/general-types';

import { isTextRequest } from '@/lib/services/runtime/types';
import { Context, ContextHandler } from '@/types';

import { AbstractManager, injectServices } from '../utils';
import { handleNLCCommand } from './nlc';
import { getNoneIntentRequest, NONE_INTENT } from './utils';

export const utils = {};

@injectServices({ utils })
/**
 * random
 */
class NLU extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  async predict({ query, model, locale, projectID }: { query: string; model?: PrototypeModel; locale?: Locale; projectID: string }) {
    // 1. first try restricted regex (no open slots) - exact string match
    if (model && locale) {
      const intent = handleNLCCommand({ query, model, locale, openSlot: false });
      if (intent.payload.intent.name !== NONE_INTENT) {
        return intent;
      }
    }

    // 2. next try to resolve with luis NLP on general-service
    const { data } = await this.services.axios
      .post<IntentRequest | null>(`${this.config.GENERAL_SERVICE_ENDPOINT}/runtime/${projectID}/predict`, {
        query,
      })
      .catch(() => ({ data: null }));

    if (data) {
      return data;
    }

    // 3. finally try open regex slot matching
    if (!model) {
      throw new Error('Model not found!');
    }
    if (!locale) {
      throw new Error('Locale not found!');
    }
    return handleNLCCommand({ query, model, locale, openSlot: true });
  }

  handle = async (context: Context) => {
    if (!isTextRequest(context.request)) {
      return context;
    }

    // empty string input - we can also consider return request: null as well (this won't advance the conversation)
    if (!context.request.payload) {
      return {
        ...context,
        request: getNoneIntentRequest(),
      };
    }

    const version = await context.data.api.getVersion(context.versionID);

    if (!version) {
      throw new Error('Version not found!');
    }

    const request = await this.predict({
      query: context.request.payload,
      model: version.prototype?.model,
      locale: version.prototype?.data.locales[0] as Locale,
      projectID: version.projectID,
    });

    return { ...context, request };
  };
}

export default NLU;
