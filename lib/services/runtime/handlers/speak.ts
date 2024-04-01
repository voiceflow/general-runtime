import { VoiceflowNode } from '@voiceflow/voiceflow-types';
import _ from 'lodash';

import { HandlerFactory } from '@/runtime';

import { FrameType, Output } from '../types';
import { addOutputTrace, speakOutputTrace } from '../utils';

const handlerUtils = {
  _sample: _.sample,
  addOutputTrace,
  speakOutputTrace,
};

export const SpeakHandler: HandlerFactory<VoiceflowNode.Speak.Node, typeof handlerUtils> = (utils) => ({
  canHandle: (node) => ('random_speak' in node ? !!node.random_speak : !!node.speak),
  handle: (node, runtime, variables) => {
    let speak = '';

    // Pick a random part to speak
    if ('random_speak' in node && Array.isArray(node.random_speak)) {
      speak = utils._sample(node.random_speak) ?? '';
    } else if ('speak' in node) {
      ({ speak } = node);
    }

    if (typeof speak === 'string') {
      const trace = utils.speakOutputTrace({ output: speak, variables });

      utils.addOutputTrace(runtime, trace, { node, variables });

      if (trace.payload.message) {
        runtime.stack.top().storage.set<Output>(FrameType.OUTPUT, trace.payload.message);
      }
    }

    return node.nextId ?? null;
  },
});

export default () => SpeakHandler(handlerUtils);
