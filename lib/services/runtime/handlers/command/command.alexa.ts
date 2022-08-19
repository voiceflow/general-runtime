/* eslint-disable no-restricted-syntax */
import { BaseNode } from '@voiceflow/base-types';
import _ from 'lodash';

import { Action, Frame as FrameUtils, Runtime } from '@/runtime';
import { Turn } from '@/runtime/lib/constants/flags.alexa';

import { IntentName } from '../../types.alexa';
import { findEventMatcher } from '../event';
import { CommandHandler } from './command';

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
    const commands = frames[index]?.getCommands<BaseNode.Utils.AnyCommand>();

    for (const command of commands) {
      const match = findEventMatcher({ event: command?.event || null, runtime, diagramID: command?.diagramID });

      if (match) {
        return { index, command, match };
      }
    }
  }

  return null;
};

const utilsObj = {
  Frame: FrameUtils,
  getCommand,
};

/**
 * The Command Handler is meant to be used inside other handlers, and should never handle nodes directly
 */
export const CommandAlexaHandler = CommandHandler({ Frame: FrameUtils, getCommand });

export default () => CommandHandler(utilsObj);
