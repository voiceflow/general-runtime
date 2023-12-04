/**
 * [[include:nlu.md]]
 * @packageDocumentation
 */

import { BaseModels, BaseRequest } from '@voiceflow/base-types';
import VError, { HTTP_STATUS } from '@voiceflow/verror';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

import { isTextRequest } from '@/lib/services/runtime/types';
import { Context, ContextHandler, VersionTag } from '@/types';

import { isConfidenceScoreAbove } from '../runtime/utils';
import { AbstractManager, injectServices } from '../utils';
import { handleNLCCommand } from './nlc';
import { NLUGatewayPredictResponse } from './types';
import { adaptNLUPrediction, getAvailableIntentsAndEntities, getNoneIntentRequest, mapChannelData } from './utils';

export const utils = {};

@injectServices({ utils })
class NLU extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  private getNluGatewayEndpoint() {
    const protocol = this.config.CLOUD_ENV === 'e2e' ? 'https' : 'http';
    return `${protocol}://${this.config.NLU_GATEWAY_SERVICE_HOST}:${this.config.NLU_GATEWAY_SERVICE_PORT_APP}`;
  }

  async predict({
    query,
    model,
    locale,
    versionID,
    tag,
    nlp,
    hasChannelIntents,
    platform,
    dmRequest,
    workspaceID,
    intentConfidence = 0.6,
    filteredIntents,
    filteredEntities,
    excludeFilteredIntents,
    excludeFilteredEntities,
  }: {
    query: string;
    model?: BaseModels.PrototypeModel;
    locale?: VoiceflowConstants.Locale;
    versionID: string;
    tag: VersionTag | string;
    nlp: boolean;
    hasChannelIntents: boolean;
    platform?: VoiceflowConstants.PlatformType;
    dmRequest?: BaseRequest.IntentRequestPayload;
    workspaceID: string;
    intentConfidence?: number;
    filteredIntents?: Set<string>;
    filteredEntities?: Set<string>;
    excludeFilteredIntents?: boolean;
    excludeFilteredEntities?: boolean;
  }): Promise<BaseRequest.IntentRequest> {
    // 1. first try restricted regex (no open slots) - exact string match
    if (model && locale) {
      const data = handleNLCCommand({ query, model, locale, openSlot: false, dmRequest });
      if (data.payload.intent.name !== VoiceflowConstants.IntentName.NONE) {
        return mapChannelData(data, platform, hasChannelIntents);
      }
    }

    const filteredIntentsArray = filteredIntents ? Array.from(filteredIntents) : undefined;
    const filteredEntitiesArray = filteredEntities ? Array.from(filteredEntities) : undefined;

    // 2. next try to determine the intent of an utterance with an NLU
    if (nlp) {
      const { data } = await this.services.axios
        .post<NLUGatewayPredictResponse>(`${this.getNluGatewayEndpoint()}/v1/predict/${versionID}`, {
          utterance: query,
          tag,
          workspaceID,
          filteredIntents: filteredIntentsArray,
          filteredEntities: filteredEntitiesArray,
          excludeFilteredIntents,
          excludeFilteredEntities,
        })
        .catch(() => ({ data: null }));

      if (data) {
        let intentRequest = adaptNLUPrediction(data);

        const { confidence } = intentRequest.payload;
        if (typeof confidence === 'number' && !isConfidenceScoreAbove(intentConfidence, confidence)) {
          // confidence of a none intent is inverse to the confidence of the predicted intent
          intentRequest = getNoneIntentRequest({ query, confidence: 1 - confidence });
        }

        return mapChannelData(intentRequest, platform, hasChannelIntents);
      }
    }

    // 3. finally try open regex slot matching
    if (!model) {
      throw new VError('Model not found. Ensure project is properly rendered.', HTTP_STATUS.NOT_FOUND);
    }
    if (!locale) {
      throw new VError('Locale not found', HTTP_STATUS.NOT_FOUND);
    }
    const data = handleNLCCommand({ query, model, locale, openSlot: true, dmRequest });
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

    const { availableIntents, availableEntities } = await getAvailableIntentsAndEntities(
      this.services.runtime,
      context
    );

    const version = await context.data.api.getVersion(context.versionID);

    const project = await context.data.api.getProject(version.projectID);

    const request = await this.predict({
      query: context.request.payload,
      model: version.prototype?.model,
      locale: version.prototype?.data.locales[0] as VoiceflowConstants.Locale,
      versionID: context.versionID,
      tag: project.liveVersion === context.versionID ? VersionTag.PRODUCTION : VersionTag.DEVELOPMENT,
      nlp: !!project.prototype?.nlp,
      hasChannelIntents: project?.platformData?.hasChannelIntents,
      platform: version?.prototype?.platform as VoiceflowConstants.PlatformType,
      workspaceID: project.teamID,
      intentConfidence: version?.platformData?.settings?.intentConfidence,
      filteredIntents: availableIntents,
      filteredEntities: availableEntities,
      excludeFilteredIntents: false,
      excludeFilteredEntities: false,
    });

    return { ...context, request };
  };
}

export default NLU;
