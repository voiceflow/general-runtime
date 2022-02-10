/* eslint-disable no-restricted-syntax */
import { BaseNode, BaseTrace } from '@voiceflow/base-types';

import { FrameType, GeneralRuntime } from '@/lib/services/runtime/types';
import { Frame, Store } from '@/runtime';

import { EventMatcher, findEventMatcher } from '../event';

export interface CommandOptions {
  diagramID?: string;
}
interface CommandMatch {
  index: number;
  match: EventMatcher;
  command: BaseNode.Utils.AnyCommand;
}

// search the stack and see if any commands match
export const getCommand = (runtime: GeneralRuntime, options: CommandOptions = {}): CommandMatch | null => {
  const frames = runtime.stack.getFrames();

  for (let index = frames.length - 1; index >= 0; index--) {
    const commands = frames[index]?.getCommands<BaseNode.Utils.AnyCommand>();

    for (const command of commands) {
      if (options.diagramID && command.diagramID && options.diagramID !== command.diagramID) {
        continue;
      }

      const match = findEventMatcher({ event: command?.event || null, runtime });

      if (match) {
        return { index, command, match };
      }
    }
  }

  return null;
};

const utilsObj = {
  Frame,
  getCommand,
};

/**
 * The Command Handler is meant to be used inside other handlers, and should never handle nodes directly
 * handlers push and jump commands
 */
export const CommandHandler = (utils: typeof utilsObj) => ({
  canHandle: (runtime: GeneralRuntime, options?: CommandOptions): boolean => !!utils.getCommand(runtime, options),
  handle: (runtime: GeneralRuntime, variables: Store, options?: CommandOptions): string | null => {
    const { command, index, match } = utils.getCommand(runtime, options)!;
    // allow matcher to apply side effects
    match.sideEffect(variables);

    const { stack, trace } = runtime;

    // interrupting command where it jumps to a node in the existing stack
    if (command.type === BaseNode.Utils.CommandType.JUMP) {
      trace.addTrace<BaseTrace.PathTrace>({
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
      trace.addTrace<BaseTrace.PathTrace>({
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
