import { BaseNode } from '@voiceflow/base-types';
import { replaceVariables, sanitizeVariables } from '@voiceflow/common';
import { VoiceNode } from '@voiceflow/voice-types';
import axios from 'axios';
import _ from 'lodash';

import Config from '@/config';
import { HandlerFactory } from '@/runtime';

import { FrameType, Output } from '../types';
import { outputTrace } from '../utils';
import { generateOutput } from './utils/output';

const GenerativeHandler: HandlerFactory<VoiceNode.Generative.Node> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.GENERATIVE,
  handle: async (node, runtime, variables) => {
    const nextID = node.nextId ?? null;

    if (!Config.ML_GATEWAY_ENDPOINT || !node.prompt) return nextID;

    const ML_GATEWAY_ENDPOINT = Config.ML_GATEWAY_ENDPOINT.split('/api')[0];
    const generativeEndpoint = `${ML_GATEWAY_ENDPOINT}/api/v1/generation/generative-response`;

    const sanitizedVars = sanitizeVariables(variables.getState());
    const prompt = replaceVariables(node.prompt, sanitizedVars);
    const { length } = node;

    const response = await axios
      .post<{ result: string }>(generativeEndpoint, { prompt, length })
      .then(({ data: { result } }) => result.trim())
      .catch(() => null);

    if (!response) return nextID;

    const output = generateOutput(response, runtime.project);

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
