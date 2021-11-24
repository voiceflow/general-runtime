import { Node as BaseNode, Trace } from '@voiceflow/base-types';
import { Node as ChatNode } from '@voiceflow/chat-types';
import { Node as GeneralNode } from '@voiceflow/general-types';
import wordsToNumbers from 'words-to-numbers';

import { Action, HandlerFactory } from '@/runtime';

import { isIntentRequest, StorageType } from '../types';
import { addButtonsIfExists } from '../utils';
import CommandHandler from './command';
import NoReplyHandler, { addNoReplyTimeoutIfExists } from './noReply';
import RepeatHandler from './repeat';

const utilsObj = {
  repeatHandler: RepeatHandler(),
  noReplyHandler: NoReplyHandler(),
  wordsToNumbers,
  commandHandler: CommandHandler(),
  addButtonsIfExists,
  addNoReplyTimeoutIfExists,
};

export const CaptureHandler: HandlerFactory<GeneralNode.Capture.Node | ChatNode.Capture.Node, typeof utilsObj> = (utils) => ({
  canHandle: (node) => !!node.variable,
  handle: (node, runtime, variables) => {
    if (runtime.getRequest() === null) {
      return utils.noReplyHandler.handle(node, runtime, variables);
    }

    if (runtime.getAction() === Action.RUNNING) {
      utils.addRepromptIfExists(node, runtime, variables);
      utils.addButtonsIfExists(node, runtime, variables);
      utils.addNoReplyTimeoutIfExists(node, runtime);

      // clean up no-replies counters on new interaction
      runtime.storage.delete(StorageType.NO_REPLIES_COUNTER);

      // quit cycleStack without ending session by stopping on itself
      return node.id;
    }

    // check if there is a command in the stack that fulfills request
    if (utils.commandHandler.canHandle(runtime)) {
      return utils.commandHandler.handle(runtime, variables);
    }

    if (utils.repeatHandler.canHandle(runtime)) {
      return utils.repeatHandler.handle(runtime);
    }

    const request = runtime.getRequest();

    if (isIntentRequest(request)) {
      const { query } = request.payload;
      if (query) {
        const num = utils.wordsToNumbers(query);

        if (typeof num !== 'number' || Number.isNaN(num)) {
          variables.set(node.variable, query);
        } else {
          variables.set(node.variable, num);
        }
      }
    }

    runtime.trace.addTrace<Trace.PathTrace>({
      type: BaseNode.Utils.TraceType.PATH,
      payload: { path: 'capture' },
    });
    return node.nextId || null;
  },
});

export default () => CaptureHandler(utilsObj);
