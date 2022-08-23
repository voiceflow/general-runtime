import { BaseNode, BaseTrace } from '@voiceflow/base-types';

import { HandlerFactory } from '@/runtime';

import _V1Handler from './_v1';

const _v1Handler = _V1Handler();

export const ChannelActionHandler: HandlerFactory<BaseNode.ChannelAction.Node> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.CHANNEL_ACTION,
  handle: (node, runtime, ...args) => {
    runtime.trace.debug(`__${node.data.name}__ - entered`);
    const _v1Node: BaseNode._v1.Node = {
      ...node,
      _v: 1,
      type: BaseTrace.TraceType.CHANNEL_ACTION,
      payload: node.data,
    };

    return _v1Handler.handle(_v1Node, runtime, ...args);
  },
});

export default ChannelActionHandler;
