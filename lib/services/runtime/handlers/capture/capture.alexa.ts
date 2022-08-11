import { VoiceflowConstants, VoiceflowNode } from '@voiceflow/voiceflow-types';
import { Intent } from 'ask-sdk-model';
import _ from 'lodash';
import wordsToNumbers from 'words-to-numbers';

import { Action, HandlerFactory } from '@/runtime';
import { Turn } from '@/runtime/lib/constants/flags.alexa';

import { addRepromptIfExists, mapSlots } from '../../utils.alexa';
import CommandHandler from '../command/command.alexa';
import RepeatHandler from '../repeat';
// import { TurnElicitSlot } from './responseBuilders';
// import { createElicitSlot } from './utils/directives';

const getSlotValue = (intent: Intent) => {
  const intentSlots = intent.slots || {};
  const value = Object.keys(intentSlots).length === 1 && Object.values(intentSlots)[0]?.value;
  if (!value) return null;

  const num = wordsToNumbers(value);
  if (typeof num !== 'number' || Number.isNaN(num)) {
    return value;
  }
  return num;
};

const utilsObj = {
  mapSlots,
  getSlotValue,
  addRepromptIfExists,
  commandHandler: CommandHandler(),
  repeatHandler: RepeatHandler(),
};

export const CaptureAlexaHandler: HandlerFactory<VoiceflowNode.Capture.Node, typeof utilsObj> = (utils) => ({
  canHandle: (node) => !!node.variable && node.platform === VoiceflowConstants.PlatformType.ALEXA,
  handle: (node, runtime, variables) => {
    const request = runtime.getRequest();

    if (runtime.getAction() === Action.RUNNING) {
      utils.addRepromptIfExists({ node, runtime, variables });

      // TODO add elicit trace?
      // if (node.intent && node.slots?.[0]) {
      //   runtime.turn.set<TurnElicitSlot>(Turn.ELICIT_SLOT, createElicitSlot(node.intent, node.slots));
      // }
      // quit cycleStack without ending session by stopping on itself
      return node.id;
    }

    let nextId: string | null = null;

    // check if there is a command in the stack that fulfills intent
    if (utils.commandHandler.canHandle(runtime)) {
      return utils.commandHandler.handle(runtime, variables);
    }

    if (utils.repeatHandler.canHandle(runtime)) {
      return utils.repeatHandler.handle(runtime);
    }

    const { intent } = request.payload;

    // try to match the first slot of the intent to the variable
    const value = utils.getSlotValue(intent);
    if (value !== null) {
      variables.set(node.variable, value);
    }

    ({ nextId = null } = node);

    // request for this turn has been processed, delete request
    runtime.turn.delete(Turn.REQUEST);

    return nextId;
  },
});

export default () => CaptureAlexaHandler(utilsObj);
