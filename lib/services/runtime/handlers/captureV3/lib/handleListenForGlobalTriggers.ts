import { CaptureType, CompiledCaptureV3Node } from '@voiceflow/dtos';

import { Runtime, Store } from '@/runtime';

import { isConfidenceScoreAbove } from '../../../utils';

interface CommandHandler {
  canHandle: (runtime: Runtime) => boolean;
  handle: (runtime: Runtime, variables: Store) => string | null;
}

type ListenForGlobalTriggersReturn =
  | {
      shouldTransfer: false;
    }
  | {
      shouldTransfer: true;
      nextStepID: string | null;
    };

const ENTIRE_RESPONSE_CONFIDENCE_THRESHOLD = 0.6;

export function handleListenForGlobalTriggers(
  node: CompiledCaptureV3Node,
  runtime: Runtime,
  variables: Store,
  commandHandler: CommandHandler
): ListenForGlobalTriggersReturn {
  if (node.data.type === CaptureType.Utterance) {
    const request = runtime.getRequest();
    const highConfidence = isConfidenceScoreAbove(ENTIRE_RESPONSE_CONFIDENCE_THRESHOLD, request.payload?.confidence);

    if (highConfidence && commandHandler.canHandle(runtime)) {
      return {
        shouldTransfer: true,
        nextStepID: commandHandler.handle(runtime, variables),
      };
    }
  }

  if (node.data.type === CaptureType.SyntheticIntent && commandHandler.canHandle(runtime)) {
    return {
      shouldTransfer: true,
      nextStepID: commandHandler.handle(runtime, variables),
    };
  }

  return {
    shouldTransfer: false,
  };
}
