/**
 * [[include:nlu.md]]
 * @packageDocumentation
 */

import { BaseNode, BaseRequest, BaseTrace } from '@voiceflow/base-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

import { isTextRequest } from '@/lib/services/runtime/types';
import { Context, ContextHandler, VersionTag } from '@/types';

import { massageVersion } from '../classification/classification.utils';
import { PredictedSlot } from '../classification/interfaces/nlu.interface';
import { Predictor } from '../classification/predictor.class';
import { AbstractManager } from '../utils';
import { getNoneIntentRequest } from './utils';

export const getIntentRequest = (
  prediction: {
    utterance: string;
    predictedIntent: string;
    predictedSlots: PredictedSlot[];
    confidence?: number;
  } | null
): BaseRequest.IntentRequest => {
  if (!prediction) {
    return getNoneIntentRequest();
  }

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
};

class NLU extends AbstractManager implements ContextHandler {
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
    const { settings, intents, slots } = massageVersion(version);
    const project = await context.data.api.getProject(version.projectID);

    if (!settings) {
      return context;
    }

    const predictor = new Predictor(
      {
        axios: this.services.axios,
        mlGateway: this.services.mlGateway,
        CLOUD_ENV: this.config.CLOUD_ENV,
        NLU_GATEWAY_SERVICE_HOST: this.config.NLU_GATEWAY_SERVICE_HOST,
        NLU_GATEWAY_SERVICE_PORT_APP: this.config.NLU_GATEWAY_SERVICE_PORT_APP,
      },
      {
        workspaceID: project.teamID,
        versionID: context.versionID,
        tag: project.liveVersion === context.versionID ? VersionTag.PRODUCTION : VersionTag.DEVELOPMENT,
        intents: intents ?? [],
        slots: slots ?? [],
      },
      settings.intentClassification,
      {
        locale: version.prototype?.data.locales[0] as VoiceflowConstants.Locale,
        hasChannelIntents: project?.platformData?.hasChannelIntents,
        platform: version?.prototype?.platform as VoiceflowConstants.PlatformType,
      }
    );

    const prediction = await predictor.predict(context.request.payload);

    if (context.trace) {
      const { llm } = predictor.predictions;
      if (llm?.errors) {
        context.trace.push(debugTrace(llm.errors.message));
      } else {
        context.trace = context.trace.concat([
          debugTrace(`LLM model: ${llm.model}`),
          debugTrace(`LLM multiplier: ${llm.multiplier}`),
          debugTrace(`LLM tokens: ${llm.tokens}`),
        ]);
      }
    }

    const request = getIntentRequest(prediction);

    return { ...context, prediction, request };
  };
}

const debugTrace = (message: string): BaseTrace.DebugTrace => ({
  type: BaseNode.Utils.TraceType.DEBUG,
  payload: {
    message,
  },
});

export default NLU;
