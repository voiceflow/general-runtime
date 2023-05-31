import { BaseUtils } from '@voiceflow/base-types';
import { replaceVariables, sanitizeVariables } from '@voiceflow/common';

import AI from '@/lib/clients/ai';

import AIAssist from '../../../aiAssist';

export const getMemoryMessages = (variablesState: Record<string, unknown>) => [
  ...((variablesState?.[AIAssist.StorageKey] as BaseUtils.ai.Message[]) || []),
];

export interface AIResponse {
  output: string | null;
  messages?: BaseUtils.ai.Message[];
  prompt?: string;
}

export const fetchChat = async (
  params: BaseUtils.ai.AIModelParams & { messages: BaseUtils.ai.Message[] },
  variablesState: Record<string, unknown> = {}
): Promise<AIResponse> => {
  const model = AI.get(params.model);
  if (!model) return { output: null };

  const sanitizedVars = sanitizeVariables(variablesState);
  const messages = params.messages.map((message) => ({
    ...message,
    content: replaceVariables(message.content, sanitizedVars),
  }));

  const system = replaceVariables(params.system, sanitizedVars);
  if (system) messages.unshift({ role: BaseUtils.ai.Role.SYSTEM, content: system });

  return { messages, output: await model.generateChatCompletion(messages, params) };
};

export const fetchPrompt = async (
  params: BaseUtils.ai.AIModelParams & { mode: BaseUtils.ai.PROMPT_MODE; prompt: string },
  variablesState: Record<string, unknown> = {}
): Promise<AIResponse> => {
  const model = AI.get(params.model);
  if (!model) return { output: null };

  const sanitizedVars = sanitizeVariables(variablesState);

  const system = replaceVariables(params.system, sanitizedVars);
  const prompt = replaceVariables(params.prompt, sanitizedVars);

  if (params.mode === BaseUtils.ai.PROMPT_MODE.MEMORY) {
    const messages = getMemoryMessages(variablesState);
    if (system) messages.unshift({ role: BaseUtils.ai.Role.SYSTEM, content: system });

    return { output: await model.generateChatCompletion(messages, params), messages };
  }
  if (params.mode === BaseUtils.ai.PROMPT_MODE.MEMORY_PROMPT) {
    const messages = getMemoryMessages(variablesState);
    if (system) messages.unshift({ role: BaseUtils.ai.Role.SYSTEM, content: system });
    if (prompt) messages.push({ role: BaseUtils.ai.Role.USER, content: prompt });

    return { output: await model.generateChatCompletion(messages, params), messages };
  }

  if (!prompt) return { output: null };

  return { prompt, output: await model.generateCompletion(prompt, params) };
};
