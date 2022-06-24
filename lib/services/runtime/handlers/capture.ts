import { BaseNode, BaseRequest, BaseTrace, RuntimeLogs } from '@voiceflow/base-types';
import { NodeType } from '@voiceflow/base-types/build/common/node';
import { ChatNode } from '@voiceflow/chat-types';
import { VoiceflowNode } from '@voiceflow/voiceflow-types';
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

export const CaptureHandler: HandlerFactory<VoiceflowNode.Capture.Node | ChatNode.Capture.Node, typeof utilsObj> = (
  utils
) => ({
  canHandle: (node) => !!node.variable || node.type === NodeType.CAPTURE,
  // eslint-disable-next-line sonarjs/cognitive-complexity
  handle: (node, runtime, variables) => {
    if (runtime.getAction() === Action.RUNNING) {
      utils.addButtonsIfExists(node, runtime, variables);
      utils.addNoReplyTimeoutIfExists(node, runtime);

      if (node.intent) {
        runtime.trace.addTrace<BaseTrace.GoToTrace>({
          type: BaseNode.Utils.TraceType.GOTO,
          payload: {
            request: {
              type: BaseRequest.RequestType.INTENT,
              payload: { intent: { name: node.intent }, query: '', entities: [] },
            },
          },
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
        const variablesBefore: Record<string, RuntimeLogs.VariableValue | null> = Object.fromEntries(
          node.slots.map((entity) => [entity, variables.get<RuntimeLogs.VariableValue>(entity) ?? null])
        );
        const variablesAfter = mapEntities(
          node.slots.map((slot) => ({ slot, variable: slot })),
          request.payload.entities
        ) as Record<string, string>; // This assertion is safe because the updated value is always a string

        variables.merge(variablesAfter);
        runtime.debugLogging.recordStepLog(RuntimeLogs.Kinds.StepLogKind.CAPTURE, node, {
          changedVariables: Object.fromEntries(
            Object.entries(variablesBefore).map(([variable, beforeValue]) => [
              variable,
              { before: beforeValue, after: variablesAfter[variable] },
            ])
          ),
        });
      }
      if (node.variable) {
        const { query } = request.payload;
        if (query) {
          const num = utils.wordsToNumbers(query);
          const isValid = typeof num === 'number' && !Number.isNaN(num);

          const variableBefore = variables.get<RuntimeLogs.VariableValue>(node.variable);
          const variableAfter = isValid ? num : query;

          runtime.debugLogging.recordStepLog(RuntimeLogs.Kinds.StepLogKind.CAPTURE, node, {
            changedVariables: {
              [node.variable]: {
                before: variableBefore ?? null,
                after: variableAfter,
              },
            },
          });
          variables.set(node.variable, variableAfter);
        }
      }
    }

    runtime.trace.addTrace<BaseTrace.PathTrace>({
      type: BaseNode.Utils.TraceType.PATH,
      payload: { path: 'capture' },
    });

    return node.nextId || null;
  },
});

export default () => CaptureHandler(utilsObj);
