import { Node as BaseNode } from '@voiceflow/base-types';
import { Node } from '@voiceflow/general-types';

import { FrameType, GeneralRuntime } from '@/lib/services/runtime/types';
import { Action, extractFrameCommand, Frame, Store } from '@/runtime';

import { findEventMatcher, hasEventMatch } from './event';

export const getCommand = (runtime: GeneralRuntime, extractFrame: typeof extractFrameCommand) => {
  const frameMatch = (command: Node.Command.Command | null) => hasEventMatch(command?.event || null, runtime);

  return extractFrame<Node.Command.Command>(runtime.stack, frameMatch) || null;
};

const utilsObj = {
  Frame,
  getCommand: (runtime: GeneralRuntime) => getCommand(runtime, extractFrameCommand),
  findEventMatcher,
};

/**
 * The Command Handler is meant to be used inside other handlers, and should never handle nodes directly
 * handlers push and jump commands
 */
export const CommandHandler = (utils: typeof utilsObj) => ({
  canHandle: (runtime: GeneralRuntime): boolean => !!utils.getCommand(runtime),
  handle: (runtime: GeneralRuntime, variables: Store): string | null => {
    const res = utils.getCommand(runtime);

    // request for this turn has been processed, set action to response
    runtime.setAction(Action.RESPONSE);

    const { command, index } = res!;
    const { event } = command;

    // allow matcher to apply side effects
    const matcher = utils.findEventMatcher({ event, runtime, variables });
    if (matcher) matcher.sideEffect();

    // interrupting command where it jumps to a node in the existing stack
    if (command.type === BaseNode.Utils.CommandType.JUMP) {
      runtime.trace.addTrace<any>({
        type: 'path',
        payload: { path: 'jump' },
      });
      if (index < runtime.stack.getSize() - 1) {
        // destructive and pop off everything before the command node
        runtime.stack.popTo(index + 1);
        runtime.stack.top().setNodeID(command.nextID);
        runtime.trace.debug(`matched command **${command.type}** - exiting flows and jumping to node`);
      }
      if (index === runtime.stack.getSize() - 1) {
        // jumping to an intent within the same flow
        runtime.trace.debug(`matched command **${command.type}** - jumping to node`);
        return command.nextID || null;
      }
    }

    // push command, adds a new frame
    if (command.type === BaseNode.Utils.CommandType.PUSH && command.diagramID) {
      runtime.trace.addTrace<any>({
        type: 'path',
        payload: { path: 'push' },
      });
      runtime.stack.top().storage.set(FrameType.CALLED_COMMAND, true);
      runtime.trace.debug(`matched command **${command.type}** - adding command flow`);
      // reset state to beginning of new diagram and store current line to the stack
      const newFrame = new utils.Frame({ programID: command.diagramID });
      runtime.stack.push(newFrame);
    }

    return null;
  },
});

export default () => CommandHandler(utilsObj);
