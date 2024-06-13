import { GeneralRuntime, StorageType } from '../../types';
import { IntentRequest, TextRequest, isIntentRequest, isTextRequest } from '@voiceflow/dtos';
import { BaseNode, BaseRequest } from '@voiceflow/base-types';
import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';
import { Predictor } from '@/lib/services/predictor';
import { castToDTO } from '@/lib/services/predictor/predictor.utils';
import { VersionTag } from '@voiceflow/base-types/build/cjs/version';

type ClassifiableNode =
  | VoiceflowNode.CaptureV2.Node
  | VoiceflowNode.Interaction.Node

export class IntentClassificationHandler {
  constructor(private readonly runtime: GeneralRuntime<IntentRequest | TextRequest>) {}

  static canHandle(runtime: GeneralRuntime) {
    const request = runtime.getRequest();
    return isTextRequest(request) || isIntentRequest(request);
  }

  async handle(node: ClassifiableNode) {
    const storedIntentRequest = this.runtime.storage.get<any>(StorageType.DM)?.intentRequest as IntentRequest;
    const intentRequest = storedIntentRequest ?? await this.getIntentRequest(node);

    this.runtime.storage.set(StorageType.DM, {
      ...this.runtime.storage.get<any>(StorageType.DM),
      intentRequest,
    });

    return intentRequest;
  }

  private async getIntentRequest(node: ClassifiableNode): Promise<IntentRequest> {
    const request = this.runtime.getRequest()!;

    if (isIntentRequest(request)) {
      return request;
    }

    switch (node.type) {
      case BaseNode.NodeType.CAPTURE_V2: {
        if (!node.intent?.name) {
          return {
            type: BaseRequest.RequestType.INTENT,
            payload: {
              intent: {
                name: 'entire_response', // TODO: what goes here?
              },
              query: request.payload,
              entities: []
            },
          };
        }

        return {
          type: BaseRequest.RequestType.INTENT,
          payload: {
            intent: {
              name: node.intent.name,
            },
            query: request.payload,
            entities: []
          },
        };
      }
      case BaseNode.NodeType.INTERACTION: {

        const versionID = this.runtime.getVersionID();
        const {version, project} = this.runtime;
        const { intentClassificationSettings, intents, isTrained, slots } = castToDTO(version as any, project as any);

        const predictor = new Predictor(
          {
            axios: this.runtime.services.axios,
            mlGateway: this.runtime.services.mlGateway,
            CLOUD_ENV: this.runtime.config.CLOUD_ENV,
            NLU_GATEWAY_SERVICE_URI: this.runtime.config.NLU_GATEWAY_SERVICE_URI,
            NLU_GATEWAY_SERVICE_PORT_APP: this.runtime.config.NLU_GATEWAY_SERVICE_PORT_APP,
          },
          {
            workspaceID: project!.teamID,
            versionID: versionID,
            tag: project!.liveVersion === versionID ? VersionTag.PRODUCTION : VersionTag.DEVELOPMENT,
            intents: intents ?? [],
            slots: slots ?? [],
            isTrained,
          },
          intentClassificationSettings,
          {
            locale: version?.prototype?.data.locales[0] as VoiceflowConstants.Locale,
            hasChannelIntents: project?.platformData?.hasChannelIntents,
            platform: version?.prototype?.platform as VoiceflowConstants.PlatformType,
          }
        );

        // TODO: debug logs

        const prediction = await predictor.predict(request.payload);

        // None Intent
        if (!prediction) {
          return {
            type: BaseRequest.RequestType.INTENT,
            payload: {
              query: request.payload,
              intent: {
                name: VoiceflowConstants.IntentName.NONE,
              },
              entities: [],
            },
          }
        }

        return {
          type: BaseRequest.RequestType.INTENT,
          payload: {
            query: prediction.utterance,
            intent: {
              name: prediction.predictedIntent,
            },
            entities: prediction.predictedSlots as any,
            confidence: prediction.confidence,
          },
        };
      }
    }
  }
}
