/**
 * Alexa command needs to be used in favor of general command because
 * it tries to fallback a cancel intent to a stop intent if there isnt
 * any cancel intent handler
 */

/* eslint-disable no-restricted-syntax */
import { AlexaConstants } from '@voiceflow/alexa-types';
import { BaseNode } from '@voiceflow/base-types';
import _ from 'lodash';

import { Action, Runtime } from '@/runtime';

import { findEventMatcher } from '../event';
import { CommandHandler, utilsObj } from '.';

const matcher =
  (intentName: string) => (command: BaseNode.Utils.AnyCommand<BaseNode.Utils.IntentEvent> | null) =>
    command?.event?.intent === intentName;

export const getCommand = (runtime: Runtime) => {
  const request = runtime.getRequest();

  if (runtime.getAction() === Action.RUNNING) return null;

  const { intent } = request.payload ?? {};
  let intentName = intent?.name;

  // If Cancel Intent is not handled turn it into Stop Intent
  // This first loop is AMAZON specific, if cancel intent is not explicitly used anywhere at all, map it to stop intent
  if (intentName === AlexaConstants.AmazonIntent.CANCEL) {
    const found = runtime.stack
      .getFrames()
      .some((frame) =>
        frame
          .getCommands<BaseNode.Utils.AnyCommand<BaseNode.Utils.IntentEvent>>()
          .some(matcher(intentName))
      );

    if (!found) {
      intentName = AlexaConstants.AmazonIntent.STOP;
      _.set(request, 'payload.intent.name', intentName);
    }
  }

  const frames = runtime.stack.getFrames();
  for (let index = frames.length - 1; index >= 0; index--) {
    const commands = frames[index]?.getCommands<BaseNode.Utils.AnyCommand>();

    for (const command of commands) {
      const match = findEventMatcher({
        event: command?.event || null,
        runtime,
        diagramID: command?.diagramID,
      });

      if (match) {
        return { index, command, match };
      }
    }
  }

  return null;
};

const utils = {
  ...utilsObj,
  getCommand,
};

export const CommandAlexaHandler = (handlerUtils: typeof utils = utils) =>
  CommandHandler(handlerUtils);

export default () => CommandAlexaHandler(utils);
