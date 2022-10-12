/**
 * [[include:nlu.md]]
 * @packageDocumentation
 */

import { BaseModels, BaseRequest } from '@voiceflow/base-types';
import VError, { HTTP_STATUS } from '@voiceflow/verror';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

import { isTextRequest } from '@/lib/services/runtime/types';
import { Context, ContextHandler, VersionTag } from '@/types';

import { AbstractManager, injectServices } from '../utils';
import { handleNLCCommand } from './nlc';
import { getNoneIntentRequest, mapChannelData, NONE_INTENT } from './utils';

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
    projectID,
    versionID,
    tag,
    nlp,
    hasChannelIntents,
    platform,
  }: {
    query: string;
    model?: BaseModels.PrototypeModel;
    locale?: VoiceflowConstants.Locale;
    projectID: string;
    versionID: string;
    tag: VersionTag | string;
    nlp: BaseModels.Project.PrototypeNLP | undefined;
    hasChannelIntents: boolean;
    platform: VoiceflowConstants.PlatformType;
  }): Promise<BaseRequest.IntentRequest> {
    // 1. first try restricted regex (no open slots) - exact string match
    if (model && locale) {
      const data = handleNLCCommand({ query, model, locale, openSlot: false });
      if (data.payload.intent.name !== NONE_INTENT) {
        return mapChannelData(data, platform, hasChannelIntents);
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
          projectID,
          versionID,
        })
        .catch(() => ({ data: null }));

      if (data) {
        return mapChannelData(data, platform, hasChannelIntents);
      }
    }

    // 3. finally try open regex slot matching
    if (!model) {
      throw new VError('Model not found. Ensure project is properly rendered.', HTTP_STATUS.NOT_FOUND);
    }
    if (!locale) {
      throw new VError('Locale not found', HTTP_STATUS.NOT_FOUND);
    }
    const data = handleNLCCommand({ query, model, locale, openSlot: true });
    return mapChannelData(data, platform, hasChannelIntents);
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

    const project = await context.data.api.getProjectNLP(version.projectID);

    const request = await this.predict({
      query: context.request.payload,
      model: version.prototype?.model,
      locale: version.prototype?.data.locales[0] as VoiceflowConstants.Locale,
      projectID: version.projectID,
      versionID: context.versionID,
      tag: project.liveVersion === context.versionID ? VersionTag.PRODUCTION : VersionTag.DEVELOPMENT,
      nlp: project.nlp,
      hasChannelIntents: version?.prototype?.hasChannelIntents,
      platform: version?.prototype?.platform as VoiceflowConstants.PlatformType,
    });

    return { ...context, request };
  };
}

export default NLU;
