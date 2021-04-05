/* eslint-disable no-restricted-syntax */
import { Node } from '@voiceflow/general-types/build/nodes/_v1';
import { TraceFrame } from '@voiceflow/general-types/build/nodes/types';
import { Action, HandlerFactory } from '@voiceflow/runtime';

import { TurnType } from '../types';
import CommandHandler from './command';
import { findEventMatcher } from './event';

const utilsObj = {
  commandHandler: CommandHandler(),
  findEventMatcher,
};

export const _V1Handler: HandlerFactory<Node, typeof utilsObj> = (utils) => ({
  canHandle: (node) => node._v === 1,
  handle: (node, runtime, variables) => {
    const defaultPath = node.paths[node.defaultPath!]?.nextID || null;

    // process req if not process before (action == REQUEST)
    if (runtime.getAction() === Action.REQUEST) {
      // request for this turn has been processed, set action to response
      runtime.setAction(Action.RESPONSE);

      for (const traceEvent of node.paths) {
        const { event = null, nextID } = traceEvent;

        const matcher = utils.findEventMatcher({ event, runtime, variables });
        if (matcher) {
          // allow handler to apply side effects
          matcher.sideEffect();
          return nextID || null;
        }
      }

      // check if there is a command in the stack that fulfills request
      if (utils.commandHandler.canHandle(runtime)) {
        return utils.commandHandler.handle(runtime, variables);
      }

      return null;
    }

    runtime.trace.addTrace<TraceFrame<string, unknown>>({
      type: node.type,
      payload: node.payload,
      defaultPath: node.defaultPath,
      paths: node.paths.map((path) => ({ event: path.event! })),
    });

    const stopTypes = runtime.turn.get<string[]>(TurnType.STOP_TYPES) || [];

    const stop = stopTypes.includes(node.type) || node.stop;
    // if !stop continue to defaultPath otherwise
    // quit cycleStack without ending session by stopping on itself
    return !stop ? defaultPath : node.id;
  },
});

export default () => _V1Handler(utilsObj);
