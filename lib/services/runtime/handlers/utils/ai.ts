import { BaseUtils } from '@voiceflow/base-types';
import { replaceVariables, sanitizeVariables } from '@voiceflow/common';
import axios from 'axios';

import Config from '@/config';
import log from '@/logger';
import { Store } from '@/runtime';

import AIAssist, { AIAssistLog } from '../../../aiAssist';

const logError = (error: Error) => {
  log.error(error);
  return null;
};

export const fetchPrompt = async (
  params: BaseUtils.ai.AIModelParams & { mode: string; prompt: string },
  variables: Store
) => {
  if (!Config.ML_GATEWAY_ENDPOINT) {
    log.error('ML_GATEWAY_ENDPOINT is not set, skipping generative node');
    return null;
  }

  const ML_GATEWAY_ENDPOINT = Config.ML_GATEWAY_ENDPOINT.split('/api')[0];

  const sanitizedVars = sanitizeVariables(variables.getState());

  const system = replaceVariables(params.system, sanitizedVars);
  const prompt = replaceVariables(params.prompt, sanitizedVars);
  const { mode, maxTokens, temperature, model } = params;

  let response: string | null = null;

  if (mode === 'Memory') {
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
      .catch(logError);
  } else if (mode === 'Prompt + Memory') {
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
      .catch(logError);
  } else {
    if (!prompt) return null;

    response = await axios
      .post<{ result: string }>(`${ML_GATEWAY_ENDPOINT}/api/v1/generation/generative-response`, {
        prompt,
        maxTokens,
        system,
        temperature,
        model,
      })
      .then(({ data: { result } }) => result)
      .catch(logError);
  }

  return response;
};
