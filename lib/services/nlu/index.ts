/**
 * [[include:nlu.md]]
 * @packageDocumentation
 */

import { BaseNode, BaseRequest, BaseTrace } from '@voiceflow/base-types';
import { AnyTrace } from '@voiceflow/base-types/build/cjs/trace';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

import { isTextRequest } from '@/lib/services/runtime/types';
import { Context, ContextHandler, VersionTag } from '@/types';

import { Predictor } from '../classification';
import { castToDTO } from '../classification/classification.utils';
import { Prediction } from '../classification/interfaces/nlu.interface';
import { AbstractManager } from '../utils';
import { getNoneIntentRequest } from './utils';

export const getIntentRequest = (prediction: Prediction | null): BaseRequest.IntentRequest => {
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
    const { settings, intents, slots } = castToDTO(version);
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
      context.trace = this.addDebugTraces(context.trace, predictor);
    }

    const request = getIntentRequest(prediction);

    return { ...context, request };
  };

  private addDebugTraces(trace: AnyTrace[], predictor: Predictor): AnyTrace[] {
    const { predictions } = predictor;
    if (!predictions.result) {
      return trace;
    }
    const newTraces: typeof trace = [];

    if (predictions.llm) {
      if (predictions.llm.error) {
        newTraces.push(debugTrace(predictions.llm.error.message));
      } else {
        newTraces.push(
          debugTrace(`LLM:
            <pre>
              model: ${predictions.llm.model}
              multiplier: ${predictions.llm.multiplier}
              tokens: ${predictions.llm.tokens}
            </pre>`)
        );
      }
    }

    if (predictions.nlu) {
      if (predictions.nlu.error) {
        newTraces.push(debugTrace(`NLU: \`${predictions.nlu.error.message}\``));
      } else {
        newTraces.push(debugTrace(`NLU: confidence: \`${predictions.nlu.confidence}\``));
      }
    }

    if (predictions.nlc) {
      if (predictions.nlc.error) {
        newTraces.push(debugTrace(`NLC: \`${predictions.nlc.error.message}\``));
      } else {
        newTraces.push(debugTrace(`NLC: open slot: ${predictions.nlc.openSlot}`));
      }
    }

    return trace.concat(newTraces);
  }
}

const debugTrace = (message: string): BaseTrace.DebugTrace => ({
  type: BaseNode.Utils.TraceType.DEBUG,
  payload: {
    message,
  },
});

export default NLU;
