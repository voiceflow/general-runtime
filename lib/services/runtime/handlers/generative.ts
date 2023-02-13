import { BaseNode } from '@voiceflow/base-types';
import { replaceVariables, sanitizeVariables } from '@voiceflow/common';
import { VoiceNode } from '@voiceflow/voice-types';
import axios from 'axios';

import Config from '@/config';
import log from '@/logger';
import { HandlerFactory } from '@/runtime';

import { FrameType, Output } from '../types';
import { outputTrace } from '../utils';
import { generateOutput } from './utils/output';
import { getVersionDefaultVoice } from './utils/version';

const GenerativeHandler: HandlerFactory<VoiceNode.Generative.Node> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.GENERATIVE,
  handle: async (node, runtime, variables) => {
    const nextID = node.nextId ?? null;

    if (!Config.ML_GATEWAY_ENDPOINT) {
      log.error('ML_GATEWAY_ENDPOINT is not set, skipping generative node');
      return nextID;
    }

    if (!runtime.project?.aiAssistSettings?.generateStep) return nextID;

    if (!node.prompt) return nextID;

    const ML_GATEWAY_ENDPOINT = Config.ML_GATEWAY_ENDPOINT.split('/api')[0];
    const generativeEndpoint = `${ML_GATEWAY_ENDPOINT}/api/v1/generation/generative-response`;

    const sanitizedVars = sanitizeVariables(variables.getState());
    const prompt = replaceVariables(node.prompt, sanitizedVars);
    const { length, voice } = node;

    const response = await axios
      .post<{ result: string }>(generativeEndpoint, { prompt, length })
      .then(({ data: { result } }) => result)
      .catch(() => null);

    if (!response) return nextID;

    const output = generateOutput(
      response,
      runtime.project,
      // use default voice if voice doesn't exist
      voice ?? getVersionDefaultVoice(runtime.version)
    );

    runtime.stack.top().storage.set<Output>(FrameType.OUTPUT, output);

    outputTrace({
      addTrace: runtime.trace.addTrace.bind(runtime.trace),
      debugLogging: runtime.debugLogging,
      node,
      output,
      variables: variables.getState(),
      ai: true,
    });

    return nextID;
  },
});

export default GenerativeHandler;
