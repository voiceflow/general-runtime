import { BaseNode } from '@voiceflow/base-types';
import _sample from 'lodash/sample';

import log from '@/logger';
import { HandlerFactory } from '@/runtime';

import { FrameType, Output } from '../types';
import { addOutputTrace, textOutputTrace } from '../utils';

const handlerUtils = {
  addOutputTrace,
  textOutputTrace,
  _sample,
};

export const TextHandler: HandlerFactory<BaseNode.Text.Node, typeof handlerUtils> = (utils) => ({
  canHandle: (node) => node.type === BaseNode.NodeType.TEXT,
  handle: (node, runtime, variables) => {
    const slate = utils._sample(node.texts);

    if (slate) {
      try {
        const trace = utils.textOutputTrace({
          delay: slate.messageDelayMilliseconds,
          output: slate.content,
          variables,
          version: runtime.version,
        });

        utils.addOutputTrace(runtime, trace, { node, variables });

        if (trace.payload.slate.content) {
          runtime.stack.top().storage.set<Output>(FrameType.OUTPUT, trace.payload.slate.content);
        }
      } catch (error) {
        log.error(`[app] [runtime] [${TextHandler.name}] failed to add Slate trace %o`, { error });
      }
    }

    return node.nextId ?? null;
  },
});

export default () => TextHandler(handlerUtils);
