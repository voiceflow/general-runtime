import { IntentRequest, TextRequest, isTextRequest } from '@voiceflow/dtos';
import { VoiceflowNode } from '@voiceflow/voiceflow-types';

import { Store } from '@/runtime';

import { GeneralRuntime, StorageType } from '../../types';

export const EntityClassificationHandler = () => ({
  canHandle: (runtime: GeneralRuntime) => isTextRequest(runtime.getRequest()),
  handle: (node: VoiceflowNode.CaptureV2.Node, runtime: GeneralRuntime<TextRequest>, _variables: Store): void => {
    const request = runtime.getRequest()!;

    let entityCaptureRequest = runtime.storage.get<any>(StorageType.DM)?.previousEntityRequest as IntentRequest | undefined;

    // Capture entire response
    if (!node.intent?.name) {
      const intentRequest: IntentRequest = {
        type: 'intent',
        payload: {
          intent: {
            name: 'entire_response',
          },
          query: request.payload,
          entities: []
        },
      };

      runtime.setRequest(intentRequest);
      return;
    }

    if (!entityCaptureRequest) {
      entityCaptureRequest = {
        type: 'intent',
        payload: {
          intent: {
            name: node.intent.name,
          },
          query: request.payload,
          entities: []
        },
      };

      runtime.storage.set(StorageType.DM, {
        ...runtime.storage.get(StorageType.DM) ?? {},
        previousEntityRequest: entityCaptureRequest
      });
    }
  }
});
