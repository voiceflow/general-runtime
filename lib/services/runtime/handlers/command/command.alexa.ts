/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable no-restricted-syntax */
import { BaseModels, BaseNode } from '@voiceflow/base-types';
import _ from 'lodash';

import { Action, Frame as FrameUtils, Runtime, Store } from '@/runtime';
import { Frame, Turn } from '@/runtime/lib/constants/flags.alexa';

import { IntentName } from '../../types.alexa';
import { mapSlots } from '../../utils.alexa';

const matcher = (intentName: string) => (command: BaseNode.Utils.AnyCommand<BaseNode.Utils.IntentEvent> | null) =>
  command?.event?.intent === intentName;

export const getCommand = (runtime: Runtime) => {
  const request = runtime.getRequest();

  if (runtime.getAction() === Action.RUNNING) return null;

  const { intent } = request.payload;
  let intentName = intent.name;

  // If Cancel Intent is not handled turn it into Stop Intent
  // This first loop is AMAZON specific, if cancel intent is not explicitly used anywhere at all, map it to stop intent
  if (intentName === IntentName.CANCEL) {
    const found = runtime.stack
      .getFrames()
      .some((frame) =>
        frame.getCommands<BaseNode.Utils.AnyCommand<BaseNode.Utils.IntentEvent>>().some(matcher(intentName))
      );

    if (!found) {
      intentName = IntentName.STOP;
      _.set(request, 'payload.intent.name', intentName);
      runtime.turn.set(Turn.REQUEST, request);
    }
  }

  const frames = runtime.stack.getFrames();
  for (let index = frames.length - 1; index >= 0; index--) {
    const commands = frames[index]?.getCommands<BaseNode.Utils.AnyCommand<BaseNode.Utils.IntentEvent>>() ?? [];

    for (const command of commands) {
      const commandDiagramID =
        (command.type === BaseNode.Utils.CommandType.PUSH && command.diagramID) ||
        (command.type === BaseNode.Utils.CommandType.JUMP && command.diagramID);
      if (request.diagramID && commandDiagramID && request.diagramID !== commandDiagramID) {
        continue;
      }

      if (matcher(intentName)(command)) {
        return { index, command, intent };
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
 * The Command Handler is meant to be used inside other handlers, and should never handle nodes directly
 */
export const CommandAlexaHandler = (utils: typeof utilsObj) => ({
  canHandle: (runtime: Runtime): boolean => {
    return !!utils.getCommand(runtime);
  },
  handle: (runtime: Runtime, variables: Store): string | null => {
    const { index, command, intent } = utils.getCommand(runtime)!;

    const variableMap: BaseModels.CommandMapping[] | undefined = command.event.mappings?.map(({ slot, variable }) => ({
      slot: slot ?? '',
      variable: variable ?? '',
    }));

    if (command.type === BaseNode.Utils.CommandType.PUSH && command.diagramID) {
      runtime.trace.debug(`matched command **${command.type}** - adding command flow`, BaseNode.NodeType.COMMAND);

      runtime.stack.top().storage.set(Frame.CALLED_COMMAND, true);

      // Reset state to beginning of new diagram and store current line to the stack
      const newFrame = new utils.Frame({ programID: command.diagramID });
      runtime.stack.push(newFrame);
    } else if (command.type === BaseNode.Utils.CommandType.JUMP && command.diagramID) {
      runtime.stack.popTo(index + 1);
      if (command.diagramID && command.diagramID !== runtime.stack.top().getProgramID()) {
        const newFrame = new utils.Frame({ programID: command.diagramID });
        runtime.stack.push(newFrame);
      }
      runtime.stack.top().setNodeID(command.nextID || null);
      runtime.trace.debug(`matched command **${command.event.intent}** - jumping to node`, BaseNode.NodeType.COMMAND);
    }

    runtime.turn.delete(Turn.REQUEST);

    if (variableMap && intent.slots) {
      // map request mappings to variables
      variables.merge(utils.mapSlots({ slots: intent.slots, mappings: variableMap }));
    }

    return null;
  },
});

export default () => CommandAlexaHandler(utilsObj);
