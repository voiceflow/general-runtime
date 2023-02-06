import { BaseNode, RuntimeLogs } from '@voiceflow/base-types';
import { replaceVariables, sanitizeVariables } from '@voiceflow/common';
import { VoiceflowNode } from '@voiceflow/voiceflow-types';
import _ from 'lodash';

import { HandlerFactory } from '@/runtime';

import { FrameType, Output } from '../types';

const SpeakHandler: HandlerFactory<VoiceflowNode.Speak.Node> = () => ({
  canHandle: (node) => ('random_speak' in node ? !!node.random_speak : !!node.speak),
  handle: (node, runtime, variables) => {
    let speak = '';

    // Pick a random part to speak
    if ('random_speak' in node && Array.isArray(node.random_speak)) {
      speak = _.sample(node.random_speak) ?? '';
    } else if ('speak' in node) {
      ({ speak } = node);
    }

    const sanitizedVars = sanitizeVariables(variables.getState());

    if (typeof speak === 'string') {
      // in case a variable's value is a text containing another variable (i.e text2="say {text}")
      const output = replaceVariables(replaceVariables(speak, sanitizedVars), sanitizedVars);

      runtime.stack.top().storage.set<Output>(FrameType.OUTPUT, output);
      runtime.trace.addTrace<BaseNode.Utils.BaseTraceFrame>({
        type: BaseNode.Utils.TraceType.SPEAK,
        payload: { message: output, type: BaseNode.Speak.TraceSpeakType.MESSAGE },
      });
      runtime.debugLogging.recordStepLog(RuntimeLogs.Kinds.StepLogKind.SPEAK, node, { text: output });
    }

    return node.nextId ?? null;
  },
});

export default SpeakHandler;
