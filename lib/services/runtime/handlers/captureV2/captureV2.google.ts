import { BaseNode, BaseTrace } from '@voiceflow/base-types';
import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';

import { Action, HandlerFactory } from '@/runtime';

import { addRepromptIfExists, isGooglePlatform, mapSlots } from '../../utils.google';
import CommandHandler from '../command/command';
import NoInputHandler from '../noReply/noReply.google';
import { EntityFillingNoMatchHandler, entityFillingRequest, setElicit } from '../utils/entity';

const utilsObj = {
  commandHandler: CommandHandler(),
  noInputHandler: NoInputHandler(),
  addRepromptIfExists,
  entityFillingNoMatchHandler: EntityFillingNoMatchHandler(),
};

export const CaptureV2GoogleHandler: HandlerFactory<VoiceflowNode.CaptureV2.Node, typeof utilsObj> = (utils) => ({
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
    const { slots, input, intent, entities } = request.payload;

    // when using prototype tool intent.slots is empty, so instead we rely on entities
    if (intent.name === node.intent?.name && node.intent?.entities && (entities || slots)) {
      variables.merge(
        mapSlots({
          mappings: node.intent.entities.map((slot) => ({ slot, variable: slot })),
          slots,
          entities,
        })
      );

      return node.nextId ?? null;
    }
    if (node.variable) {
      variables.set(node.variable, input);

      return node.nextId ?? null;
    }

    // handle noMatch
    const noMatchHandler = utils.entityFillingNoMatchHandler.handle(node, runtime, variables);

    return node.intent?.name
      ? noMatchHandler([node.intent?.name], entityFillingRequest(node.intent?.name, node.intent.entities))
      : noMatchHandler();
  },
});

export default () => CaptureV2GoogleHandler(utilsObj);
