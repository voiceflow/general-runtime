/* eslint-disable no-await-in-loop */

import { Action } from '@/runtime';
import { EventType } from '@/runtime/lib/Lifecycle';
import ProgramModel from '@/runtime/lib/Program';
import Runtime from '@/runtime/lib/Runtime';
import Storage from '@/runtime/lib/Runtime/Store';

export const HANDLER_OVERFLOW = 400;

const cycleHandler = async (runtime: Runtime, program: ProgramModel, variableState: Storage): Promise<void> => {
  const referenceFrame = runtime.stack.top();
  const currentFrames = runtime.stack.getFrames();

  let nextID: string | null = null;
  let i = 0;
  let node = program.getNode(referenceFrame.getNodeID());

  do {
    if (i > HANDLER_OVERFLOW) {
      node = null;
      break;
    } else if (nextID) {
      referenceFrame.setNodeID(nextID);
      node = program.getNode(nextID);
      nextID = null;
    }

    if (node !== null) {
      const _node = node; // resolve TS type

      try {
        const handler = runtime.getHandlers().find((h) => h.canHandle(_node, runtime, variableState, program));

        if (handler) {
          await runtime.callEvent(EventType.handlerWillHandle, { node, variables: variableState });

          nextID = await handler.handle(_node, runtime, variableState, program);

          await runtime.callEvent(EventType.handlerDidHandle, { node, variables: variableState });
        }
      } catch (error) {
        await runtime.callEvent(EventType.handlerDidCatch, { error });
      }

      // after the first handler, the request is processed
      if (runtime.getAction() === Action.REQUEST) {
        runtime.setAction(Action.RUNNING);
      }

      // if a node has decided to stop on itself
      if (node.id === nextID) {
        runtime.end();
      }

      // exit conditions for handler loop
      if (!nextID || runtime.hasEnded() || currentFrames !== runtime.stack.getFrames()) {
        node = null;
      }
    }

    i++;
  } while (node);
};

export default cycleHandler;
