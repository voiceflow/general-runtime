/**
 * [[include:nlu.md]]
 * @packageDocumentation
 */

import { BaseRequest } from '@voiceflow/base-types';
import VError, { HTTP_STATUS } from '@voiceflow/verror';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

import { isTextRequest } from '@/lib/services/runtime/types';
import { Context, ContextHandler, VersionTag } from '@/types';

import { AbstractManager } from '../utils';
import { hybridPredict } from './llmHybrid';
import { handleNLCCommand } from './nlc';
import { NLUGatewayPredictResponse, PredictProps } from './types';
import {
  getAvailableIntentsAndEntities,
  getNoneIntentRequest,
  isHybridLLMStrategy,
  mapChannelData,
  resolveIntentConfidence,
} from './utils';

class NLU extends AbstractManager implements ContextHandler {
  private getNluGatewayEndpoint() {
    const protocol = this.config.CLOUD_ENV === 'e2e' ? 'https' : 'http';
    return `${protocol}://${this.config.NLU_GATEWAY_SERVICE_HOST}:${this.config.NLU_GATEWAY_SERVICE_PORT_APP}`;
  }

  async getNLUPrediction({
    tag,
    query,
    versionID,
    workspaceID,
    nluSettings,
    filteredIntents,
    filteredEntities,
    excludeFilteredIntents,
    excludeFilteredEntities,
  }: PredictProps): Promise<NLUGatewayPredictResponse | null> {
    const filteredIntentsArray = filteredIntents ? Array.from(filteredIntents) : undefined;
    const filteredEntitiesArray = filteredEntities ? Array.from(filteredEntities) : undefined;

    const { data } = await this.services.axios
      .post<NLUGatewayPredictResponse>(`${this.getNluGatewayEndpoint()}/v1/predict/${versionID}`, {
        utterance: query,
        tag,
        workspaceID,
        filteredIntents: filteredIntentsArray,
        filteredEntities: filteredEntitiesArray,
        excludeFilteredIntents,
        excludeFilteredEntities,
        ...(isHybridLLMStrategy(nluSettings) && { limit: 10 }),
      })
      .catch(() => ({ data: null }));

    return data;
  }

  async predict(props: PredictProps): Promise<BaseRequest.IntentRequest> {
    const {
      nlp,
      query,
      model,
      trace,
      locale = VoiceflowConstants.Locale.EN_US,
      platform,
      dmRequest,
      nluSettings,
      hasChannelIntents,
    } = props;

    // 1. first try restricted regex (no open slots) - exact string match
    if (model) {
      const data = handleNLCCommand({ query, model, locale, openSlot: false, dmRequest });
      if (data.payload.intent.name !== VoiceflowConstants.IntentName.NONE) {
        return mapChannelData(data, platform, hasChannelIntents);
      }
    }

    // 2. next try to determine the intent of an utterance with an NLU
    if (nlp) {
      const data = await this.getNLUPrediction(props);

      if (data && isHybridLLMStrategy(nluSettings) && model) {
        return hybridPredict({
          utterance: query,
          nluResults: data,
          nluModel: model,
          ai: this.services.ai,
          trace,
        });
      }

      if (data) {
        return resolveIntentConfidence(data, props);
      }
    }

    // 3. finally try open regex slot matching
    if (!model) {
      throw new VError('Model not found. Ensure project is properly rendered.', HTTP_STATUS.NOT_FOUND);
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
      nluSettings: project.nluSettings,
      trace: context.trace,
    });

    return { ...context, request };
  };
}

export default NLU;
