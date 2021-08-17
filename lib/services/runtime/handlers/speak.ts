import { Node as BaseNode } from '@voiceflow/base-types';
import { replaceVariables, sanitizeVariables } from '@voiceflow/common';
import { Node } from '@voiceflow/general-types';
import _ from 'lodash';

import { HandlerFactory } from '@/runtime';

import { FrameType, SpeakFrame, StorageType } from '../types';

// TODO: probably we can remove it, since prompt is not used in the node handler, and does not exist in general service handler
const isPromptSpeak = (node: Node.Speak.Node & { prompt?: unknown }) => _.isString(node.prompt) && node.prompt !== 'true';

const SpeakHandler: HandlerFactory<Node.Speak.Node> = () => ({
  canHandle: (node) => ('random_speak' in node ? !!node.random_speak : !!node.speak) || isPromptSpeak(node),
  handle: (node, runtime, variables) => {
    let speak = '';

    // Pick a random part to speak
    if ('random_speak' in node && Array.isArray(node.random_speak)) {
      speak = _.sample(node.random_speak) ?? '';
    } else if ('speak' in node) {
      ({ speak } = node);
    }

    const sanitizedVars = sanitizeVariables(variables.getState());

    if (_.isString(speak)) {
      // in case a variable's value is a text containing another variable (i.e text2="say {text}")
      const output = replaceVariables(replaceVariables(speak, sanitizedVars), sanitizedVars);

      runtime.storage.produce((draft) => {
        draft[StorageType.OUTPUT] += output;
      });

      runtime.stack.top().storage.set<SpeakFrame>(FrameType.SPEAK, output);
      runtime.trace.addTrace<BaseNode.Utils.BaseTraceFrame>({
        type: BaseNode.Utils.TraceType.SPEAK,
        payload: { message: output, type: BaseNode.Speak.TraceSpeakType.MESSAGE },
      });
    }

    return node.nextId ?? null;
  },
});

export default SpeakHandler;
