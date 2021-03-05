/* eslint-disable no-restricted-syntax */

import { Node, TraceFrame } from '@voiceflow/general-types/build/nodes/trace';
import { Action, HandlerFactory } from '@voiceflow/runtime';

import CommandHandler from './command';
import { findEventMatcher } from './event';

const utilsObj = {
  commandHandler: CommandHandler(),
  findEventMatcher,
};

export const TraceHandler: HandlerFactory<Node, typeof utilsObj> = (utils) => ({
  canHandle: (node) => !!node._v,
  handle: (node, runtime, variables) => {
    const defaultPath = node.paths[node.defaultPath!]?.nextID || null;

    // process req if not process before (action == REQUEST)
    if (runtime.getAction() === Action.REQUEST) {
      // request for this turn has been processed, set action to response
      runtime.setAction(Action.RESPONSE);

      for (const traceEvent of node.paths) {
        const { event, nextID } = traceEvent;

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

    runtime.trace.addTrace<TraceFrame>({
      type: node.type,
      payload: { data: node.data, paths: node.paths },
    });

    // if !stop continue to defaultPath otherwise
    // quit cycleStack without ending session by stopping on itself
    return !node.stop ? defaultPath : node.id;
  },
});

export default () => TraceHandler(utilsObj);
