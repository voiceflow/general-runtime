import { BaseModels, BaseNode, BaseTrace } from '@voiceflow/base-types';
import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';

import { Action, HandlerFactory } from '@/runtime';

import { addRepromptIfExists, isGooglePlatform, mapSlots } from '../../utils.google';
import CommandHandler from '../command/command';
import NoMatchHandler from '../noMatch/noMatch.google';
import NoInputHandler from '../noReply/noReply.google';
import { entityFillingRequest, setElicit } from '../utils/entity';

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
        runtime.trace.addTrace<BaseTrace.GoToTrace>({
          type: BaseTrace.TraceType.GOTO,
          payload: { request: setElicit(entityFillingRequest(node.intent.name, node.intent.entities), true) },
        });
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

      return node.nextId ?? null;
    }
    if (node.variable) {
      variables.set(node.variable, input);

      return node.nextId ?? null;
    }

    // handle noMatch
    const noMatchPath = utils.noMatchHandler.handle(node, runtime, variables);
    if (noMatchPath === node.id && node.intent?.name) {
      runtime.trace.addTrace<BaseTrace.GoToTrace>({
        type: BaseTrace.TraceType.GOTO,
        payload: { request: entityFillingRequest(node.intent.name, node.intent.entities) },
      });
    }

    return noMatchPath;
  },
});

export default () => CaptureV2Handler(utilsObj);
