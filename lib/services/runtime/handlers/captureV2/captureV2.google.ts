import { BaseModels, BaseNode } from '@voiceflow/base-types';
import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';

import { Action, HandlerFactory } from '@/runtime';
import { Turn } from '@/runtime/lib/constants/flags.google';

import { addRepromptIfExists, isGooglePlatform, mapSlots } from '../../utils.google';
import CommandHandler from '../command/command.google';
import NoMatchHandler from '../noMatch/noMatch.google';
import NoInputHandler from '../noReply/noReply.google';

const utilsObj = {
  commandHandler: CommandHandler(),
  noMatchHandler: NoMatchHandler(),
  noInputHandler: NoInputHandler(),
  addRepromptIfExists,
};

export const CaptureV2Handler: HandlerFactory<VoiceflowNode.CaptureV2.Node, typeof utilsObj> = (utils) => ({
  canHandle: (node) =>
    node.type === BaseNode.NodeType.CAPTURE_V2 && isGooglePlatform(node.platform as VoiceflowConstants.PlatformType),
  handle: (node, runtime, variables) => {
    const request = runtime.getRequest();

    if (runtime.getAction() === Action.RUNNING) {
      utils.addRepromptIfExists(node, runtime, variables);

      if (node.intent) {
        runtime.turn.set(Turn.GOTO, node.intent.name);
      }

      // quit cycleStack without ending session by stopping on itself
      return node.id;
    }

    // check if there is a command in the stack that fulfills intent
    if (utils.commandHandler.canHandle(runtime)) {
      return utils.commandHandler.handle(runtime, variables);
    }

    // check for no input in v2
    if (utils.noInputHandler.canHandle(runtime)) {
      return utils.noInputHandler.handle(node, runtime, variables);
    }
    const { slots, input, intent } = request.payload;

    if (intent.name === node.intent?.name && node.intent?.entities && slots) {
      const entities: BaseModels.SlotMapping[] = node.intent.entities.map((slot) => ({ slot, variable: slot }));
      variables.merge(mapSlots(entities, slots));

      runtime.turn.delete(Turn.REQUEST);
      return node.nextId ?? null;
    }
    if (node.variable) {
      variables.set(node.variable, input);

      runtime.turn.delete(Turn.REQUEST);
      return node.nextId ?? null;
    }

    // request for this turn has been processed, delete request
    runtime.turn.delete(Turn.REQUEST);

    // handle noMatch
    const noMatchPath = utils.noMatchHandler.handle(node, runtime, variables);
    if (noMatchPath === node.id && node.intent?.name) {
      runtime.turn.set(Turn.GOTO, node.intent.name);
    }

    return noMatchPath;
  },
});

export default () => CaptureV2Handler(utilsObj);
