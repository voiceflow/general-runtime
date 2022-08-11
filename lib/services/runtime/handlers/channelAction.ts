/* eslint-disable no-restricted-syntax */
import { BaseNode } from '@voiceflow/base-types';
import { object, replaceVariables } from '@voiceflow/common';

import { Action, HandlerFactory } from '@/runtime';

import { TurnType } from '../types';
import CommandHandler from './command';
import { findEventMatcher } from './event';

const utilsObj = {
  commandHandler: CommandHandler(),
  findEventMatcher,
};

export const ChannelActionHandler: HandlerFactory<BaseNode.ChannelAction.Node, typeof utilsObj> = (utils) => ({
  canHandle: (node) => node.type === BaseNode.NodeType.CHANNEL_ACTION,
  handle: (node, runtime, variables) => {
    const defaultPath = node.paths[node.defaultPath ?? 0]?.nextID || null;

    // process req if not process before (action == REQUEST)
    if (runtime.getAction() === Action.REQUEST) {
      for (const traceEvent of node.paths) {
        const { event = null, nextID } = traceEvent;

        const matcher = utils.findEventMatcher({ event, runtime });
        if (matcher) {
          // allow handler to apply side effects
          matcher.sideEffect(variables);
          return nextID || null;
        }
      }

      // check if there is a command in the stack that fulfills request
      if (utils.commandHandler.canHandle(runtime)) {
        return utils.commandHandler.handle(runtime, variables);
      }

      return null;
    }

    const variablesMap = variables.getState();
    const payload = object.deepMap(
      node.data.payload,
      (value) => replaceVariables(value as string, variablesMap) as unknown
    );

    runtime.trace.addTrace<BaseNode.Utils.BaseTraceFrame<unknown>>({
      type: node.data.name,
      payload,
      defaultPath: node.defaultPath,
      paths: node.paths.map((path) => ({ label: path.label, event: path.event! })),
    });

    const stopTypes = runtime.turn.get<string[]>(TurnType.STOP_TYPES) || [];

    const stop = runtime.turn.get(TurnType.STOP_ALL) || stopTypes.includes(node.type) || node.stop;
    // if !stop continue to defaultPath otherwise
    // quit cycleStack without ending session by stopping on itself
    return !stop ? defaultPath : node.id;
  },
});

export default () => ChannelActionHandler(utilsObj);
