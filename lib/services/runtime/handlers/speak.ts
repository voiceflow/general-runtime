import { replaceVariables, sanitizeVariables } from '@voiceflow/common';
import { TraceType } from '@voiceflow/general-types';
import { Node, TraceFrame } from '@voiceflow/general-types/build/nodes/speak';
import { HandlerFactory } from '@voiceflow/runtime';
import _ from 'lodash';

import { FrameType, SpeakFrame, StorageType } from '../types';

const SpeakHandler: HandlerFactory<Node> = () => ({
  canHandle: (node) => ('random_speak' in node ? !!node.random_speak : !!node.speak) || (_.isString(node.prompt) && node.prompt !== 'true'),
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
      runtime.trace.addTrace<TraceFrame>({ type: TraceType.SPEAK, payload: { message: output } });
    }

    return node.nextId ?? null;
  },
});

export default SpeakHandler;
