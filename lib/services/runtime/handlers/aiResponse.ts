import { BaseNode } from '@voiceflow/base-types';
import { replaceVariables, sanitizeVariables } from '@voiceflow/common';
import { VoiceNode } from '@voiceflow/voice-types';
import axios from 'axios';

import Config from '@/config';
import log from '@/logger';
import { HandlerFactory } from '@/runtime';

import AIAssist, { AIAssistLog } from '../../aiAssist';
import { FrameType, Output } from '../types';
import { addOutputTrace, getOutputTrace } from '../utils';
import { generateOutput } from './utils/output';
import { getVersionDefaultVoice } from './utils/version';

const AIResponseHandler: HandlerFactory<VoiceNode.AIResponse.Node> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.AI_RESPONSE,
  handle: async (node, runtime, variables) => {
    const nextID = node.nextId ?? null;

    if (!Config.ML_GATEWAY_ENDPOINT) {
      log.error('ML_GATEWAY_ENDPOINT is not set, skipping generative node');
      return nextID;
    }

    const ML_GATEWAY_ENDPOINT = Config.ML_GATEWAY_ENDPOINT.split('/api')[0];

    const sanitizedVars = sanitizeVariables(variables.getState());
    const prompt = replaceVariables(node.prompt, sanitizedVars);
    const system = replaceVariables(node.system, sanitizedVars);

    const { maxTokens, temperature, model, voice } = node;

    let response: string | null = null;

    if ((node as any).mode === 'Memory') {
      const messages = [...(variables.get<AIAssistLog>(AIAssist.StorageKey) || [])];
      if (system) messages.unshift({ role: 'system', content: system });

      response = await axios
        .post<{ result: string }>(`${ML_GATEWAY_ENDPOINT}/api/v1/generation/chat`, {
          messages,
          maxTokens,
          temperature,
          model,
        })
        .then(({ data: { result } }) => result)
        .catch(() => null);
    } else if ((node as any).mode === 'Prompt + Memory') {
      const messages = [...(variables.get<AIAssistLog>(AIAssist.StorageKey) || [])];
      if (system) messages.unshift({ role: 'system', content: system });
      messages.push({ role: 'system', content: prompt });

      response = await axios
        .post<{ result: string }>(`${ML_GATEWAY_ENDPOINT}/api/v1/generation/chat`, {
          messages,
          maxTokens,
          temperature,
          model,
        })
        .then(({ data: { result } }) => result)
        .catch(() => null);
    } else {
      if (!node.prompt) return nextID;

      response = await axios
        .post<{ result: string }>(`${ML_GATEWAY_ENDPOINT}/api/v1/generation/generative-response`, {
          prompt,
          maxTokens,
          system,
          temperature,
          model,
        })
        .then(({ data: { result } }) => result)
        .catch(() => null);
    }

    if (!response) return nextID;

    const output = generateOutput(
      response,
      runtime.project,
      // use default voice if voice doesn't exist
      voice ?? getVersionDefaultVoice(runtime.version)
    );

    runtime.stack.top().storage.set<Output>(FrameType.OUTPUT, output);

    addOutputTrace(
      runtime,
      getOutputTrace({
        output,
        variables,
        version: runtime.version,
        ai: true,
      }),
      { variables }
    );

    return nextID;
  },
});

export default AIResponseHandler;
