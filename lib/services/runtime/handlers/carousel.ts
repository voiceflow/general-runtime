import { BaseNode, BaseTrace } from '@voiceflow/base-types';
import { deepVariableSubstitution, replaceVariables, sanitizeVariables } from '@voiceflow/common';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

import { Action, HandlerFactory } from '@/runtime';

import { StorageType } from '../types';
import { slateInjectVariables, slateToPlaintext } from '../utils';
import { isGooglePlatform } from '../utils.google';
import CommandHandler from './command/command';
import { CommandAlexaHandler } from './command/command.alexa';
import NoMatchHandler from './noMatch/noMatch';
import { NoMatchAlexaHandler } from './noMatch/noMatch.alexa';
import { NoMatchGoogleHandler } from './noMatch/noMatch.google';
import NoReplyHandler, { addNoReplyTimeoutIfExists } from './noReply/noReply';
import { NoReplyGoogleHandler } from './noReply/noReply.google';

const handlerUtils = {
  commandHandler: (node: BaseNode.Carousel.Node) =>
    node.platform === VoiceflowConstants.PlatformType.ALEXA ? CommandAlexaHandler() : CommandHandler(),
  noMatchHandler: (node: BaseNode.Carousel.Node) => {
    if (node.platform === VoiceflowConstants.PlatformType.ALEXA) return NoMatchAlexaHandler();
    if (isGooglePlatform(node.platform as VoiceflowConstants.PlatformType)) return NoMatchGoogleHandler();
    return NoMatchHandler();
  },
  noReplyHandler: (node: BaseNode.Carousel.Node) =>
    isGooglePlatform(node.platform as VoiceflowConstants.PlatformType) ? NoReplyGoogleHandler() : NoReplyHandler(),

  slateToPlaintext,
  sanitizeVariables,
  slateInjectVariables,
  addNoReplyTimeoutIfExists,
};

export const CarouselHandler: HandlerFactory<BaseNode.Carousel.Node, typeof handlerUtils> = (utils) => ({
  canHandle: (node) => node.type === BaseNode.NodeType.CAROUSEL,
  // eslint-disable-next-line sonarjs/cognitive-complexity
  handle: (node, runtime, variables) => {
    const defaultPath = node.nextId || null;
    const isStartingFromCarouselStep = runtime.getAction() === Action.REQUEST && !runtime.getRequest();

    if (runtime.getAction() === Action.RUNNING || isStartingFromCarouselStep) {
      const variablesMap = variables.getState();
      const sanitizedVars = utils.sanitizeVariables(variables.getState());
      const cards: BaseNode.Carousel.TraceCarouselCard[] = [];

      node.cards.forEach((card) => {
        const slate = utils.slateInjectVariables(card.description, sanitizedVars);
        const text = utils.slateToPlaintext(slate);

        const item = {
          ...card,
          title: replaceVariables(card.title, variablesMap),
          imageUrl: replaceVariables(card.imageUrl, variablesMap),
          description: {
            slate,
            text,
          },
          buttons: card.buttons.map((button) => deepVariableSubstitution(button, variablesMap)),
        };

        if (item.title || item.imageUrl || item.description.text || item.buttons.length) {
          cards.push(item);
        }
      });

      if (cards?.length) {
        runtime.trace.addTrace<BaseNode.Carousel.TraceFrame>({
          type: BaseTrace.TraceType.CAROUSEL,
          payload: {
            layout: node.layout,
            cards,
          },
        });
      }

      if (node.isBlocking) {
        utils.addNoReplyTimeoutIfExists(node, runtime);

        // clean up no-matches and no-replies counters on new interaction
        runtime.storage.delete(StorageType.NO_MATCHES_COUNTER);
        runtime.storage.delete(StorageType.NO_REPLIES_COUNTER);

        // quit cycleStack without ending session by stopping on itself
        return node.id;
      }

      return defaultPath;
    }

    if (runtime.getAction() === Action.REQUEST && utils.commandHandler(node).canHandle(runtime)) {
      return utils.commandHandler(node).handle(runtime, variables);
    }

    if (!node.isBlocking) return null;

    if (utils.noReplyHandler(node).canHandle(runtime)) {
      return utils.noReplyHandler(node).handle(node, runtime, variables);
    }

    return utils.noMatchHandler(node).handle(node, runtime, variables);
  },
});

export default () => CarouselHandler(handlerUtils);
