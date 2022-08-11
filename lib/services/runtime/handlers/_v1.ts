/* eslint-disable no-restricted-syntax */
import { BaseNode } from '@voiceflow/base-types';
import { object, replaceVariables } from '@voiceflow/common';

import { Action, HandlerFactory } from '@/runtime';

import { TurnType } from '../types';
import CommandHandler from './command/command';
import { findEventMatcher } from './event';

const utilsObj = {
  commandHandler: CommandHandler(),
  findEventMatcher,
};

export const _V1Handler: HandlerFactory<BaseNode._v1.Node, typeof utilsObj> = (utils) => ({
  canHandle: (node) => node._v === 1,
  handle: (node, runtime, variables) => {
    const defaultPath = node.paths[node.defaultPath!]?.nextID || null;

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
    const type = replaceVariables(node.type, variablesMap);
    const payload = object.deepMap(node.payload, (value) =>
      typeof value === 'string' ? replaceVariables(value, variablesMap) : value
    );

    runtime.trace.addTrace<BaseNode.Utils.BaseTraceFrame<unknown>>({
      type,
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

export default () => _V1Handler(utilsObj);
