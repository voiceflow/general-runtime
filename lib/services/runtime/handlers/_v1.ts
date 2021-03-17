/* eslint-disable no-restricted-syntax */
import { Node, TraceFrame } from '@voiceflow/general-types/build/nodes/_v1';
import { Action, HandlerFactory } from '@voiceflow/runtime';
import _ from 'lodash';

import { StorageType } from '../types';
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

    runtime.trace.addTrace<TraceFrame>({
      type: node.type,
      payload: { data: node.payload, paths: node.paths, stop: node.stop, defaultPath: node.defaultPath },
    });

    const stopTypes = runtime.storage.get<string[]>(StorageType.STOP_TYPES) || [];

    const stop = stopTypes.includes(_.get(node.payload, 'name')) || node.stop;
    // if !stop continue to defaultPath otherwise
    // quit cycleStack without ending session by stopping on itself
    return !stop ? defaultPath : node.id;
  },
});

export default () => _V1Handler(utilsObj);
