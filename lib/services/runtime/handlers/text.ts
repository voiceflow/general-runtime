import { BaseNode, BaseTrace } from '@voiceflow/base-types';
import { sanitizeVariables } from '@voiceflow/common';
import _sample from 'lodash/sample';

import log from '@/logger';
import { HandlerFactory } from '@/runtime';

import { FrameType, Output } from '../types';
import { slateInjectVariables, slateToPlaintext } from '../utils';

const handlerUtils = {
  _sample,
  slateToPlaintext,
  sanitizeVariables,
  slateInjectVariables,
};

export const TextHandler: HandlerFactory<BaseNode.Text.Node, typeof handlerUtils> = (utils) => ({
  canHandle: (node) => node.type === BaseNode.NodeType.TEXT,
  handle: (node, runtime, variables) => {
    const slate = utils._sample(node.texts);

    if (slate) {
      try {
        const sanitizedVars = utils.sanitizeVariables(variables.getState());
        const content = utils.slateInjectVariables(slate.content, sanitizedVars);
        const message = utils.slateToPlaintext(content);

        runtime.stack.top().storage.set<Output>(FrameType.OUTPUT, content);
        runtime.trace.addTrace<BaseTrace.TextTrace>({
          type: BaseNode.Utils.TraceType.TEXT,
          payload: { slate: { ...slate, content }, message },
        });
      } catch (error) {
        log.error(`[app] [runtime] [${TextHandler.name}] failed to add Slate trace ${log.vars({ error })}`);
      }
    }

    return node.nextId ?? null;
  },
});

export default () => TextHandler(handlerUtils);
