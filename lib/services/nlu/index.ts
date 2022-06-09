/**
 * [[include:nlu.md]]
 * @packageDocumentation
 */

import { BaseModels, BaseRequest } from '@voiceflow/base-types';
import VError from '@voiceflow/verror';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

import { isTextRequest } from '@/lib/services/runtime/types';
import { Context, ContextHandler, VersionTag } from '@/types';

import { AbstractManager, injectServices } from '../utils';
import { handleNLCCommand } from './nlc';
import { getNoneIntentRequest, NONE_INTENT } from './utils';

export const utils = {};

@injectServices({ utils })
/**
 * random
 */
class NLU extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  async predict({
    query,
    model,
    locale,
    tag,
    nlp,
  }: {
    query: string;
    model?: BaseModels.PrototypeModel;
    locale?: VoiceflowConstants.Locale;
    tag: string;
    nlp: BaseModels.Project.PrototypeNLP | undefined;
  }): Promise<BaseRequest.IntentRequest> {
    // 1. first try restricted regex (no open slots) - exact string match
    if (model && locale) {
      const intent = handleNLCCommand({ query, model, locale, openSlot: false });
      if (intent.payload.intent.name !== NONE_INTENT) {
        return intent;
      }
    }

    // 2. next try to resolve with luis NLP
    if (nlp && nlp.appID && nlp.resourceID) {
      const { appID, resourceID } = nlp;

      const { data } = await this.services.axios
        .post(`${this.config.LUIS_SERVICE_ENDPOINT}/predict/${appID}`, {
          query,
          resourceID,
          tag,
        })
        .catch(() => ({ data: null }));

      if (data) {
        return data;
      }
    }

    // 3. finally try open regex slot matching
    if (!model) {
      throw new VError('Model not found', 404);
    }
    if (!locale) {
      throw new VError('Locale not found', 404);
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

    const version = await context.data.api.getVersion(context.versionID).catch(() => null);
    if (!version) {
      throw new VError('Version not found', 404);
    }

    const project = await context.data.api.getProject(version.projectID).catch(() => null);
    if (!project) {
      throw new VError('Project not found', 404);
    }

    const request = await this.predict({
      query: context.request.payload,
      model: version.prototype?.model,
      locale: version.prototype?.data.locales[0] as VoiceflowConstants.Locale,
      tag: project.liveVersion === context.versionID ? VersionTag.PRODUCTION : VersionTag.DEVELOPMENT,
      nlp: project.prototype?.nlp,
    });

    return { ...context, request };
  };
}

export default NLU;
