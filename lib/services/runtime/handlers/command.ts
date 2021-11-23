import { Node as BaseNode, Trace } from '@voiceflow/base-types';

import { FrameType, GeneralRuntime } from '@/lib/services/runtime/types';
import { Action, extractFrameCommand, Frame, Store } from '@/runtime';

import { findEventMatcher, hasEventMatch } from './event';

export const getCommand = (runtime: GeneralRuntime, extractFrame: typeof extractFrameCommand) => {
  const frameMatch = (command: BaseNode.Utils.AnyCommand | null) => hasEventMatch(command?.event || null, runtime);

  return extractFrame<BaseNode.Utils.AnyCommand>(runtime.stack, frameMatch) || null;
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

    const { command, index } = res!;
    const { event } = command;
    const { stack, trace } = runtime;

    // allow matcher to apply side effects
    const matcher = utils.findEventMatcher({ event, runtime, variables });
    if (matcher) matcher.sideEffect();

    // interrupting command where it jumps to a node in the existing stack
    if (command.type === BaseNode.Utils.CommandType.JUMP) {
      trace.addTrace<Trace.PathTrace>({
        type: BaseNode.Utils.TraceType.PATH,
        payload: { path: 'jump' },
      });

      // destructive and pop off everything before the command node
      stack.popTo(index + 1);

      if (command.diagramID && command.diagramID !== stack.top().getProgramID()) {
        const newFrame = new utils.Frame({ programID: command.diagramID });
        stack.push(newFrame);
      }

      stack.top().setNodeID(command.nextID || null);
      trace.debug(`matched command **${command.type}** - jumping to node`, BaseNode.NodeType.COMMAND);
    }

    // push command, adds a new frame
    if (command.type === BaseNode.Utils.CommandType.PUSH && command.diagramID) {
      trace.addTrace<Trace.PathTrace>({
        type: BaseNode.Utils.TraceType.PATH,
        payload: { path: 'push' },
      });
      stack.top().storage.set(FrameType.CALLED_COMMAND, true);
      trace.debug(`matched command **${command.type}** - adding command flow`, BaseNode.NodeType.COMMAND);
      // reset state to beginning of new diagram and store current line to the stack
      const newFrame = new utils.Frame({ programID: command.diagramID });
      stack.push(newFrame);
    }

    return null;
  },
});

export default () => CommandHandler(utilsObj);
