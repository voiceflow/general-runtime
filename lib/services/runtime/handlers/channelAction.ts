import { BaseNode } from '@voiceflow/base-types';
import { AnyRecord, object, replaceVariables } from '@voiceflow/common';

import { HandlerFactory } from '@/runtime';

import { _V1Handler } from './_v1';
import CommandHandler from './command';
import { findEventMatcher } from './event';

const getNodeType = (node: BaseNode.ChannelAction.Node) => {
  return node.data.name;
};

const getNodePayload = (node: BaseNode.ChannelAction.Node, variablesMap: Readonly<AnyRecord>) => {
  return object.deepMap(node.data.payload, (value) => replaceVariables(value as string, variablesMap) as unknown);
};

const utilsObj = {
  commandHandler: CommandHandler(),
  findEventMatcher,
};

type channelActionUtils = typeof utilsObj & {
  getNodeType?: (node: BaseNode.ChannelAction.Node, variablesMap?: Readonly<AnyRecord>) => string;
  getNodePayload?: (node: BaseNode.ChannelAction.Node, variablesMap: Readonly<AnyRecord>) => unknown;
};

export const ChannelActionHandler: HandlerFactory<BaseNode.ChannelAction.Node, channelActionUtils> = (utils) => ({
  canHandle: (node) => node.type === BaseNode.NodeType.CHANNEL_ACTION,
  handle: (_V1Handler as any as HandlerFactory<BaseNode.ChannelAction.Node, channelActionUtils>)(utils).handle,
});

export default () => ChannelActionHandler({ ...utilsObj, getNodeType, getNodePayload });
