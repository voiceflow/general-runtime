import { CompiledNodeCaptureType, WithCompiledListenForOtherTriggers } from '@voiceflow/dtos';

import { Runtime, Store } from '@/runtime';

import { isConfidenceScoreAbove } from '../../utils';

interface CommandHandler {
  canHandle: (runtime: Runtime) => boolean;
  handle: (runtime: Runtime, variables: Store) => string | null;
}

type ListenForOtherTriggersReturn =
  | {
      shouldTransfer: false;
    }
  | {
      shouldTransfer: true;
      nextStepID: string | null;
    };

const ENTIRE_RESPONSE_CONFIDENCE_THRESHOLD = 0.6;

export function handleListenForOtherTriggers(
  node: { data: { type: CompiledNodeCaptureType }; fallback: WithCompiledListenForOtherTriggers },
  runtime: Runtime,
  variables: Store,
  commandHandler: CommandHandler
): ListenForOtherTriggersReturn {
  if (node.data.type === CompiledNodeCaptureType.UTTERANCE) {
    const request = runtime.getRequest();
    const highConfidence = isConfidenceScoreAbove(ENTIRE_RESPONSE_CONFIDENCE_THRESHOLD, request.payload?.confidence);

    if (highConfidence && commandHandler.canHandle(runtime)) {
      return {
        shouldTransfer: true,
        nextStepID: commandHandler.handle(runtime, variables),
      };
    }
  }

  if (node.data.type === CompiledNodeCaptureType.SYNTHETIC_INTENT && commandHandler.canHandle(runtime)) {
    return {
      shouldTransfer: true,
      nextStepID: commandHandler.handle(runtime, variables),
    };
  }

  return {
    shouldTransfer: false,
  };
}
