import { CompiledCaptureV3Node, NodeType } from '@voiceflow/dtos';

import { Action, HandlerFactory } from '@/runtime';

import { addNoReplyTimeoutIfExistsV2 } from '../noReply';

const utils = {
  addNoReplyTimeoutIfExistsV2,
};

export const CaptureV3Handler: HandlerFactory<CompiledCaptureV3Node, typeof utils> = (utils) => ({
  canHandle: (node) => node.type === NodeType.CAPTURE_V3,
  handle: (node, runtime, _variables) => {
    if (runtime.getAction() === Action.RUNNING) {
      utils.addNoReplyTimeoutIfExistsV2(node, runtime);
    }

    return null;
  },
});

export default () => CaptureV3Handler(utils);
