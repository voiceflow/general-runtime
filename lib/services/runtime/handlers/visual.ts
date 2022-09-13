import { BaseNode, BaseTrace } from '@voiceflow/base-types';
import { replaceVariables } from '@voiceflow/common';

import { HandlerFactory } from '@/runtime';

const handlerUtils = {
  replaceVariables,
};

const VisualHandler: HandlerFactory<BaseNode.Visual.Node, typeof handlerUtils> = (utils) => ({
  canHandle: (node) => node.type === BaseNode.NodeType.VISUAL && !!node.data,

  handle: (node, runtime, variables) => {
    runtime.trace.debug('__visual__ - entered', BaseNode.NodeType.VISUAL);

    if (node.data.visualType === BaseNode.Visual.VisualType.APL && node.data.imageURL) {
      node.data.imageURL = utils.replaceVariables(node.data.imageURL, variables.getState());
    } else if (node.data.visualType === BaseNode.Visual.VisualType.IMAGE && node.data.image) {
      node.data.image = utils.replaceVariables(node.data.image, variables.getState());
    }

    runtime.trace.addTrace<BaseTrace.VisualTrace>({
      type: BaseNode.Utils.TraceType.VISUAL,
      payload: node.data,
    });

    return node.nextId ?? null;
  },
});

export default () => VisualHandler(handlerUtils);
