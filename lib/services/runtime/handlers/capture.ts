import { Node as BaseNode, Request, Trace } from '@voiceflow/base-types';
import { NodeType } from '@voiceflow/base-types/build/common/node';
import { Node as ChatNode } from '@voiceflow/chat-types';
import { Node as GeneralNode } from '@voiceflow/general-types';
import wordsToNumbers from 'words-to-numbers';

import { Action, HandlerFactory } from '@/runtime';

import { isIntentRequest, StorageType } from '../types';
import { addButtonsIfExists, mapEntities } from '../utils';
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
  canHandle: (node) => !!node.variable || node.type === NodeType.CAPTURE,
  handle: (node, runtime, variables) => {
    if (runtime.getAction() === Action.RUNNING) {
      utils.addButtonsIfExists(node, runtime, variables);
      utils.addNoReplyTimeoutIfExists(node, runtime);

      if (node.intent) {
        runtime.trace.addTrace<Trace.GoToTrace>({
          type: BaseNode.Utils.TraceType.GOTO,
          payload: { request: { type: Request.RequestType.INTENT, payload: { intent: { name: node.intent }, query: '', entities: [] } } },
        });
      }

      // clean up no-replies counters on new interaction
      runtime.storage.delete(StorageType.NO_REPLIES_COUNTER);

      // quit cycleStack without ending session by stopping on itself
      return node.id;
    }

    if (utils.noReplyHandler.canHandle(runtime)) {
      return utils.noReplyHandler.handle(node, runtime, variables);
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
      if (!node.variable && node.slots?.length && request.payload.entities) {
        variables.merge(
          mapEntities(
            node.slots.map((slot) => ({ slot, variable: slot })),
            request.payload.entities
          )
        );
      }
      if (node.variable) {
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
    }

    runtime.trace.addTrace<Trace.PathTrace>({
      type: BaseNode.Utils.TraceType.PATH,
      payload: { path: 'capture' },
    });
    return node.nextId || null;
  },
});

export default () => CaptureHandler(utilsObj);
