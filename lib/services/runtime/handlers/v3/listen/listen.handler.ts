import { BaseNode } from '@voiceflow/base-types';

import { HandlerFactory } from '@/runtime';

const BaseListenHandler: HandlerFactory<BaseNode.Visual.Node, Record<string, never>> = (_) => ({
  canHandle: () => false,
  handle: () => null,
});

export const ListenHandler = () => BaseListenHandler({});
