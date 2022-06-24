import { BaseNode, BaseTrace } from '@voiceflow/base-types';
import { NodeType } from '@voiceflow/base-types/build/common/node';
import { replaceVariables, sanitizeVariables } from '@voiceflow/common';

import { Action, HandlerFactory } from '@/runtime';

import { StorageType } from '../types';
import { slateInjectVariables, slateToPlaintext } from '../utils';
import CommandHandler from './command';
import NoMatchHandler from './noMatch';
import NoReplyHandler, { addNoReplyTimeoutIfExists } from './noReply';

const handlerUtils = {
  commandHandler: CommandHandler(),
  noMatchHandler: NoMatchHandler(),
  noReplyHandler: NoReplyHandler(),

  slateToPlaintext,
  sanitizeVariables,
  slateInjectVariables,
  addNoReplyTimeoutIfExists,
};

export const CarouselHandler: HandlerFactory<BaseNode.Carousel.Node, typeof handlerUtils> = (utils) => ({
  canHandle: (node) => node.type === NodeType.CAROUSEL,
  handle: (node, runtime, variables) => {
    const defaultPath = node.nextId || null;
    const isStartingFromCarouselStep = runtime.getAction() === Action.REQUEST && !runtime.getRequest();

    if (runtime.getAction() === Action.RUNNING || isStartingFromCarouselStep) {
      const variablesMap = variables.getState();
      const sanitizedVars = utils.sanitizeVariables(variables.getState());

      const cards = node.cards.map((card) => {
        const slate = utils.slateInjectVariables(card.description, sanitizedVars);
        const text = utils.slateToPlaintext(slate);

        return {
          ...card,
          title: replaceVariables(card.title, variablesMap),
          description: {
            slate,
            text,
          },
          buttons: card.buttons.map((button) => ({
            ...button,
            name: replaceVariables(button.name, variablesMap),
          })),
        };
      });

      runtime.trace.addTrace<BaseNode.Carousel.TraceFrame>({
        type: BaseTrace.TraceType.CAROUSEL,
        payload: {
          layout: node.layout,
          cards,
        },
      });

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

    if (runtime.getAction() === Action.REQUEST && utils.commandHandler.canHandle(runtime)) {
      return utils.commandHandler.handle(runtime, variables);
    }

    if (!node.isBlocking) return null;

    if (utils.noReplyHandler.canHandle(runtime)) {
      return utils.noReplyHandler.handle(node, runtime, variables);
    }

    return utils.noMatchHandler.handle(node, runtime, variables);
  },
});

export default () => CarouselHandler(handlerUtils);
