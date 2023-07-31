import { BaseUtils } from '@voiceflow/base-types';
import { replaceVariables, sanitizeVariables } from '@voiceflow/common';

import AI from '@/lib/clients/ai';

import AIAssist from '../../../aiAssist';

export const getMemoryMessages = (variablesState: Record<string, unknown>) => [
  ...((variablesState?.[AIAssist.StorageKey] as BaseUtils.ai.Message[]) || []),
];

export const getMemoryMessagesString = (variablesState: Record<string, unknown>) => {
  return getMemoryMessages(variablesState)
    .map(({ content, role }) => (role === 'assistant' ? 'AI: ' : 'user: ') + content)
    .join('\n');
};

export interface AIResponse {
  output: string | null;
  messages?: BaseUtils.ai.Message[];
  prompt?: string;
  tokens?: number;
  queryTokens?: number;
  answerTokens?: number;
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

  const { output, tokens, queryTokens, answerTokens } = (await model.generateChatCompletion(messages, params)) ?? {
    output: null,
    tokens: 0,
    queryTokens: 0,
    answerTokens: 0,
  };

  return { messages, output, tokens, queryTokens, answerTokens };
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

    const { output, tokens, queryTokens, answerTokens } = (await model.generateChatCompletion(messages, params)) ?? {
      output: null,
      tokens: 0,
      queryTokens: 0,
      answerTokens: 0,
    };

    return { output, tokens, queryTokens, answerTokens };
  }
  if (params.mode === BaseUtils.ai.PROMPT_MODE.MEMORY_PROMPT) {
    const messages = getMemoryMessages(variablesState);
    if (system) messages.unshift({ role: BaseUtils.ai.Role.SYSTEM, content: system });
    if (prompt) messages.push({ role: BaseUtils.ai.Role.USER, content: prompt });

    const { output, tokens, queryTokens, answerTokens } = (await model.generateChatCompletion(messages, params)) ?? {
      output: null,
      tokens: 0,
      queryTokens: 0,
      answerTokens: 0,
    };

    return { output, tokens, queryTokens, answerTokens };
  }

  if (!prompt) return { output: null };

  const { output, tokens, queryTokens, answerTokens } = (await model.generateCompletion(prompt, params)) ?? {
    output: null,
    tokens: 0,
    queryTokens: 0,
    answerTokens: 0,
  };

  return { output, tokens, queryTokens, answerTokens };
};
