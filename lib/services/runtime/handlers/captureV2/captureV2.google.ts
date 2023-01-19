/**
 * Google captureV2 needs to be used in favor of general captureV2 because
 * it adds reprompts if exists
 * it handles captureV2 very differently
 */
import { BaseNode, BaseTrace } from '@voiceflow/base-types';
import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';

import { Action, HandlerFactory } from '@/runtime';

import { addRepromptIfExists, mapEntities } from '../../utils';
import { isGooglePlatform } from '../../utils.google';
import CommandHandler from '../command';
import { addNoReplyTimeoutIfExists } from '../noReply';
import NoReplyHandler from '../noReply/noReply.google';
import { EntityFillingNoMatchHandler, entityFillingRequest, setElicit } from '../utils/entity';

const utilsObj = {
  commandHandler: CommandHandler(),
  noReplyHandler: NoReplyHandler(),
  addRepromptIfExists,
  addNoReplyTimeoutIfExists,
  entityFillingNoMatchHandler: EntityFillingNoMatchHandler(),
};

export const CaptureV2GoogleHandler: HandlerFactory<VoiceflowNode.CaptureV2.Node, typeof utilsObj> = (utils) => ({
  canHandle: (node) =>
    isGooglePlatform(node.platform as VoiceflowConstants.PlatformType) && node.type === BaseNode.NodeType.CAPTURE_V2,
  handle: (node, runtime, variables) => {
    const request = runtime.getRequest();

    if (runtime.getAction() === Action.RUNNING) {
      utils.addRepromptIfExists(node, runtime, variables);
      utils.addNoReplyTimeoutIfExists(node, runtime);

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
    if (utils.noReplyHandler.canHandle(runtime)) {
      return utils.noReplyHandler.handle(node, runtime, variables);
    }

    const { input, intent, entities } = request.payload;
    if (intent.name === node.intent?.name && node.intent?.entities) {
      variables.merge(
        mapEntities(
          node.intent.entities.map((slot) => ({ slot, variable: slot })),
          entities
        )
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
