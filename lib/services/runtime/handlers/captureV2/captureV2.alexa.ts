import { BaseNode, BaseTrace } from '@voiceflow/base-types';
import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';
import _ from 'lodash';

import { Action, HandlerFactory } from '@/runtime';

import { addRepromptIfExists, mapSlots } from '../../utils.alexa';
import CommandHandler from '../command/command.alexa';
import NoMatchHandler from '../noMatch/noMatch.alexa';
import RepeatHandler from '../repeat';
import { entityFillingRequest, setElicit } from '../utils/entity';

const utilsObj = {
  addRepromptIfExists,
  noMatchHandler: NoMatchHandler(),
  commandHandler: CommandHandler(),
  repeatHandler: RepeatHandler(),
};

export const CaptureV2AlexaHandler: HandlerFactory<VoiceflowNode.CaptureV2.Node, typeof utilsObj> = (utils) => ({
  canHandle: (node) =>
    node.type === BaseNode.NodeType.CAPTURE_V2 && node.platform === VoiceflowConstants.PlatformType.ALEXA,
  // eslint-disable-next-line sonarjs/cognitive-complexity
  handle: (node, runtime, variables) => {
    const request = runtime.getRequest();

    if (runtime.getAction() === Action.RUNNING) {
      utils.addRepromptIfExists({ node, runtime, variables });

      if (node.intent?.entities) {
        runtime.trace.addTrace<BaseTrace.GoToTrace>({
          type: BaseTrace.TraceType.GOTO,
          payload: { request: setElicit(entityFillingRequest(node.intent.name, node.intent.entities), true) },
        });
      }
      // quit cycleStack without ending session by stopping on itself
      return node.id;
    }

    // check if there is a command in the stack that fulfills intent
    if (node.intentScope !== BaseNode.Utils.IntentScope.NODE && utils.commandHandler.canHandle(runtime)) {
      return utils.commandHandler.handle(runtime, variables);
    }

    if (utils.repeatHandler.canHandle(runtime)) {
      return utils.repeatHandler.handle(runtime);
    }

    const { intent } = request.payload;

    if (intent.name === node.intent?.name) {
      const firstEntity = intent.slots?.[node.intent?.entities?.[0] ?? ''];
      if (node.variable && firstEntity) {
        variables.set(node.variable, firstEntity.value);
      } else if (node.intent?.entities && intent.slots) {
        variables.merge(
          mapSlots({ slots: intent.slots, mappings: node.intent.entities.map((slot) => ({ slot, variable: slot })) })
        );
      }
      return node.nextId ?? null;
    }

    // handle noMatch
    const noMatchPath = utils.noMatchHandler.handle(node, runtime, variables);
    if (noMatchPath === node.id && node.intent?.entities) {
      runtime.trace.addTrace<BaseTrace.GoToTrace>({
        type: BaseTrace.TraceType.GOTO,
        payload: { request: entityFillingRequest(node.intent.name, node.intent.entities) },
      });
    }

    return noMatchPath;
  },
});

export default () => CaptureV2AlexaHandler(utilsObj);
