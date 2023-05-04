import { BaseUtils } from '@voiceflow/base-types';
import { replaceVariables, sanitizeVariables } from '@voiceflow/common';
import axios from 'axios';

import Config from '@/config';
import log from '@/logger';

import AIAssist, { AIAssistLog } from '../../../aiAssist';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const logError = (error: Error) => {
  log.error(error);
  return null;
};

const getMLGateWayEndpoint = () => {
  if (!Config.ML_GATEWAY_ENDPOINT) {
    log.error('ML_GATEWAY_ENDPOINT is not set');
    return null;
  }
  return Config.ML_GATEWAY_ENDPOINT.split('/api')[0];
};

export const generateChat = async (messages: Message[], params: BaseUtils.ai.AIModelParams) => {
  const ML_GATEWAY_ENDPOINT = getMLGateWayEndpoint();
  if (!ML_GATEWAY_ENDPOINT) return null;

  const { maxTokens, temperature, model } = params;

  return axios
    .post<{ result: string }>(`${ML_GATEWAY_ENDPOINT}/api/v1/generation/chat`, {
      messages,
      maxTokens,
      temperature,
      model,
    })
    .then(({ data: { result } }) => result)
    .catch(logError);
};

export const generateCompletion = async (prompt: string, params: BaseUtils.ai.AIModelParams) => {
  const ML_GATEWAY_ENDPOINT = getMLGateWayEndpoint();
  if (!ML_GATEWAY_ENDPOINT) return null;

  const { maxTokens, temperature, model } = params;

  return axios
    .post<{ result: string }>(`${ML_GATEWAY_ENDPOINT}/api/v1/generation/generative-response`, {
      prompt,
      maxTokens,
      temperature,
      model,
    })
    .then(({ data: { result } }) => result)
    .catch(logError);
};

export const getMemoryMessages = (variablesState: Record<string, unknown>) => [
  ...((variablesState?.[AIAssist.StorageKey] as AIAssistLog) || []),
];

export const fetchChat = async (
  params: BaseUtils.ai.AIModelParams & { messages: Message[] },
  variablesState: Record<string, unknown> = {}
): Promise<{ messages?: Message[]; output: string | null }> => {
  const sanitizedVars = sanitizeVariables(variablesState);
  const messages = params.messages.map((message) => ({
    ...message,
    content: replaceVariables(message.content, sanitizedVars),
  }));

  const system = replaceVariables(params.system, sanitizedVars);
  if (system) messages.unshift({ role: 'system', content: system });

  return { messages, output: await generateChat(messages, params) };
};

export const fetchPrompt = async (
  params: BaseUtils.ai.AIModelParams & { mode: BaseUtils.ai.PROMPT_MODE; prompt: string },
  variablesState: Record<string, unknown>
): Promise<{ prompt?: string; messages?: Message[]; output: string | null }> => {
  if (!Config.ML_GATEWAY_ENDPOINT) {
    log.error('ML_GATEWAY_ENDPOINT is not set, skipping generative node');
    return { output: null };
  }

  const sanitizedVars = sanitizeVariables(variablesState);

  const system = replaceVariables(params.system, sanitizedVars);
  const prompt = replaceVariables(params.prompt, sanitizedVars);

  if (params.mode === BaseUtils.ai.PROMPT_MODE.MEMORY) {
    const messages = getMemoryMessages(variablesState);
    if (system) messages.unshift({ role: 'system', content: system });

    return { output: await generateChat(messages, params), messages };
  }
  if (params.mode === BaseUtils.ai.PROMPT_MODE.MEMORY_PROMPT) {
    const messages = getMemoryMessages(variablesState);
    if (system) messages.unshift({ role: 'system', content: system });
    if (prompt) messages.push({ role: 'user', content: prompt });

    return { messages, output: await generateChat(messages, params) };
  }
  if (!prompt) return { output: null };

  return { prompt, output: await generateCompletion(prompt, params) };
};
