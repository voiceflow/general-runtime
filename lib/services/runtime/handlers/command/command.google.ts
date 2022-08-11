/* eslint-disable sonarjs/cognitive-complexity */
import { BaseModels, BaseNode, BaseTrace } from '@voiceflow/base-types';

import { Action, Frame as FrameUtils, Runtime, Store } from '@/runtime';
import { Frame, Turn } from '@/runtime/lib/constants/flags.google';

import { GeneralRuntime } from '../../types';
import { mapSlots } from '../../utils.google';

export interface CommandOptions {
  diagramID?: string;
}

export interface CommandMatch {
  index: number;
  command: BaseNode.Utils.AnyCommand<BaseNode.Utils.IntentEvent>;
  slots?: { [key: string]: string };
}

export const getCommand = (runtime: Runtime, options: CommandOptions = {}): CommandMatch | null => {
  const request = runtime.getRequest();
  if (runtime.getAction() === Action.RUNNING) {
    return null;
  }

  const { action, intent, slots } = request.payload;

  const matcher = (command: BaseNode.Utils.AnyCommand<BaseNode.Utils.IntentEvent> | null) =>
    command?.event.intent === intent.name || command?.event.intent === action;

  const frames = runtime.stack.getFrames();
  for (let index = frames.length - 1; index >= 0; index--) {
    const commands = frames[index]?.getCommands<BaseNode.Utils.AnyCommand<BaseNode.Utils.IntentEvent>>() ?? [];

    // eslint-disable-next-line no-restricted-syntax
    for (const command of commands) {
      const commandDiagramID =
        (command.type === BaseNode.Utils.CommandType.PUSH && command.diagramID) ||
        (command.type === BaseNode.Utils.CommandType.JUMP && command.diagramID);
      if (options.diagramID && commandDiagramID && options.diagramID !== commandDiagramID) {
        continue;
      }

      if (matcher(command)) {
        return { index, command, slots };
      }
    }
  }

  return null;
};

const utilsObj = {
  Frame: FrameUtils,
  mapSlots,
  getCommand,
};

/**
 * The Command Handler is meant to be used inside other handlers, and should never handle blocks directly
 */
export const CommandGoogleHandler = (utils: typeof utilsObj) => ({
  canHandle: (runtime: GeneralRuntime, options?: CommandOptions): boolean => !!utils.getCommand(runtime, options),
  handle: (runtime: Runtime, variables: Store, options?: CommandOptions): null => {
    const { index, command, slots } = utils.getCommand(runtime, options)!;

    const variableMap: BaseModels.CommandMapping[] | undefined = command.event.mappings?.map(({ slot, variable }) => ({
      slot: slot ?? '',
      variable: variable ?? '',
    }));

    if (command.type === BaseNode.Utils.CommandType.PUSH && command.diagramID) {
      runtime.trace.addTrace<BaseTrace.PathTrace>({
        type: BaseNode.Utils.TraceType.PATH,
        payload: { path: 'push' },
      });
      runtime.stack.top().storage.set(Frame.CALLED_COMMAND, true);
      runtime.trace.debug(`matched command **${command.type}** - adding command flow`, BaseNode.NodeType.COMMAND);

      // Reset state to beginning of new diagram and store current line to the stack
      const newFrame = new utils.Frame({ programID: command.diagramID });
      runtime.stack.push(newFrame);
    }
    if (command.type === BaseNode.Utils.CommandType.JUMP && command.diagramID) {
      runtime.trace.addTrace<BaseTrace.PathTrace>({
        type: BaseNode.Utils.TraceType.PATH,
        payload: { path: 'jump' },
      });
      runtime.stack.popTo(index + 1);
      if (command.diagramID && command.diagramID !== runtime.stack.top().getProgramID()) {
        const newFrame = new utils.Frame({ programID: command.diagramID });
        runtime.stack.push(newFrame);
      }
      runtime.stack.top().setNodeID(command.nextID || null);
      runtime.trace.debug(`matched command **${command.type}** - jumping to node`, BaseNode.NodeType.COMMAND);
    }

    runtime.turn.delete(Turn.REQUEST);

    if (variableMap && slots) {
      // map request mappings to variables
      variables.merge(utils.mapSlots(variableMap, slots));
    }

    return null;
  },
});

export default () => CommandGoogleHandler(utilsObj);
