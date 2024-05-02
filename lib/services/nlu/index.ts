/**
 * [[include:nlu.md]]
 * @packageDocumentation
 */

import { BaseNode, BaseRequest, BaseTrace } from '@voiceflow/base-types';
import * as DTO from '@voiceflow/dtos';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

import { Context, ContextHandler, VersionTag } from '@/types';

import { DebugEvent, Predictor } from '../classification';
import { castToDTO } from '../classification/classification.utils';
import { Prediction } from '../classification/interfaces/nlu.interface';
import { AbstractManager } from '../utils';
import { getNoneIntentRequest } from './utils';

export const getIntentRequest = (prediction: Prediction | null): DTO.IntentRequest => {
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
    if (!DTO.isTextRequest(context.request)) {
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
    const { intentClassificationSettings, intents, isTrained, slots } = castToDTO(version, project);

    const predictor = new Predictor(
      {
        axios: this.services.axios,
        mlGateway: this.services.mlGateway,
        CLOUD_ENV: this.config.CLOUD_ENV,
        NLU_GATEWAY_SERVICE_URI: this.config.NLU_GATEWAY_SERVICE_URI,
        NLU_GATEWAY_SERVICE_PORT_APP: this.config.NLU_GATEWAY_SERVICE_PORT_APP,
      },
      {
        workspaceID: project.teamID,
        versionID: context.versionID,
        tag: project.liveVersion === context.versionID ? VersionTag.PRODUCTION : VersionTag.DEVELOPMENT,
        intents: intents ?? [],
        slots: slots ?? [],
        isTrained,
      },
      intentClassificationSettings,
      {
        locale: version.prototype?.data.locales[0] as VoiceflowConstants.Locale,
        hasChannelIntents: project?.platformData?.hasChannelIntents,
        platform: version?.prototype?.platform as VoiceflowConstants.PlatformType,
      }
    );

    const addDebug = (event: DebugEvent) => {
      const prefix = `${event.type.toUpperCase()}: `;
      context.trace?.push(debugTrace(`${prefix}${event.message}`));
    };

    if (context.trace) {
      predictor.on('debug', addDebug);
    }

    const prediction = await predictor.predict(context.request.payload);

    const request = getIntentRequest(prediction);

    predictor.removeListener('debug', addDebug);

    return { ...context, request };
  };
}

const debugTrace = (message: string): BaseTrace.DebugTrace => ({
  type: BaseNode.Utils.TraceType.DEBUG,
  payload: {
    message,
  },
});

export default NLU;
