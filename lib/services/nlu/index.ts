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
import { getNoneIntentRequest, mapChannelData } from './utils';

export const utils = {};

interface PredictedSlot {
  name: string;
  value: string;
}
export interface NLUGatewayPredictResponse {
  utterance: string;
  predictedIntent: string;
  predictedSlots: PredictedSlot[];
  confidence: number;
}

@injectServices({ utils })
class NLU extends AbstractManager<{ utils: typeof utils }> implements ContextHandler {
  private adaptNLUPrediction(prediction: NLUGatewayPredictResponse): BaseRequest.IntentRequest {
    return {
      type: BaseRequest.RequestType.INTENT,
      payload: {
        query: prediction.utterance,
        intent: {
          name: prediction.predictedIntent,
        },
        entities: prediction.predictedSlots,
        confidence: prediction.confidence,
      },
    };
  }

  private getNluGatewayEndpoint() {
    const protocol = this.config.IS_MESHED === 'true' ? 'http' : 'https';
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
    dmRequest?: BaseRequest.IntentRequestPayload;
    workspaceID: number;
  }): Promise<BaseRequest.IntentRequest> {
    // 1. first try restricted regex (no open slots) - exact string match
    if (model && locale) {
      const data = handleNLCCommand({ query, model, locale, openSlot: false, dmRequest });
      if (data.payload.intent.name !== VoiceflowConstants.IntentName.NONE) {
        return mapChannelData(data, platform, hasChannelIntents);
      }
    }

    // 2. next try to resolve with luis NLP
    if (nlp && nlp.appID && nlp.resourceID) {
      const { data } = await this.services.axios
        .post<NLUGatewayPredictResponse>(`${this.getNluGatewayEndpoint()}/v1/predict/${versionID}`, {
          utterance: query,
          tag,
          workspaceID,
        })
        .catch(() => ({ data: null }));

      if (data) {
        const intentRequest = this.adaptNLUPrediction(data);
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

    const version = await context.data.api.getVersion(context.versionID);

    const project = await context.data.api.getProject(version.projectID);

    const request = await this.predict({
      query: context.request.payload,
      model: version.prototype?.model,
      locale: version.prototype?.data.locales[0] as VoiceflowConstants.Locale,
      projectID: version.projectID,
      versionID: context.versionID,
      tag: project.liveVersion === context.versionID ? VersionTag.PRODUCTION : VersionTag.DEVELOPMENT,
      nlp: project.prototype?.nlp,
      hasChannelIntents: project?.platformData?.hasChannelIntents,
      platform: version?.prototype?.platform as VoiceflowConstants.PlatformType,
      workspaceID: Number(project.teamID),
    });

    return { ...context, request };
  };
}

export default NLU;
