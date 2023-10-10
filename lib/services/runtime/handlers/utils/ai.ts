import { BaseNode, BaseUtils } from '@voiceflow/base-types';
import { replaceVariables, sanitizeVariables } from '@voiceflow/common';

import { AIModel } from '@/lib/clients/ai/ai-model';
import { CompletionOptions } from '@/lib/clients/ai/ai-model.interface';
import { QuotaName } from '@/lib/services/billing';
import log from '@/logger';
import { Runtime } from '@/runtime';

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
  tokens: number;
  queryTokens: number;
  answerTokens: number;
}

export const EMPTY_AI_RESPONSE: AIResponse = {
  output: null,
  tokens: 0,
  queryTokens: 0,
  answerTokens: 0,
};

export const fetchChat = async (
  params: BaseUtils.ai.AIModelParams & { messages: BaseUtils.ai.Message[] },
  model: AIModel | null,
  variablesState: Record<string, unknown> = {},
  options: CompletionOptions = {}
): Promise<AIResponse> => {
  if (!model) return EMPTY_AI_RESPONSE;

  const sanitizedVars = sanitizeVariables(variablesState);
  const messages = params.messages.map((message) => ({
    ...message,
    content: replaceVariables(message.content, sanitizedVars),
  }));

  const system = replaceVariables(params.system, sanitizedVars);
  if (system) messages.unshift({ role: BaseUtils.ai.Role.SYSTEM, content: system });

  const { output, tokens, queryTokens, answerTokens } =
    (await model.generateChatCompletion(messages, params, options)) ?? EMPTY_AI_RESPONSE;

  return { messages, output, tokens, queryTokens, answerTokens };
};

export const fetchPrompt = async (
  params: BaseUtils.ai.AIModelParams & { mode: BaseUtils.ai.PROMPT_MODE; prompt: string },
  model: AIModel | null,
  variablesState: Record<string, unknown> = {},
  options: CompletionOptions = {}
): Promise<AIResponse> => {
  if (!model) return EMPTY_AI_RESPONSE;

  const sanitizedVars = sanitizeVariables(variablesState);

  const system = replaceVariables(params.system, sanitizedVars);
  const prompt = replaceVariables(params.prompt, sanitizedVars);

  if (params.mode === BaseUtils.ai.PROMPT_MODE.MEMORY) {
    const messages = getMemoryMessages(variablesState);
    if (system) messages.unshift({ role: BaseUtils.ai.Role.SYSTEM, content: system });

    const { output, tokens, queryTokens, answerTokens } =
      (await model.generateChatCompletion(messages, params, options)) ?? EMPTY_AI_RESPONSE;

    return { output, tokens, queryTokens, answerTokens };
  }
  if (params.mode === BaseUtils.ai.PROMPT_MODE.MEMORY_PROMPT) {
    const messages = getMemoryMessages(variablesState);
    if (system) messages.unshift({ role: BaseUtils.ai.Role.SYSTEM, content: system });
    if (prompt) messages.push({ role: BaseUtils.ai.Role.USER, content: prompt });

    const { output, tokens, queryTokens, answerTokens } =
      (await model.generateChatCompletion(messages, params, options)) ?? EMPTY_AI_RESPONSE;

    return { output, tokens, queryTokens, answerTokens };
  }

  if (!prompt) return EMPTY_AI_RESPONSE;

  const { output, tokens, queryTokens, answerTokens } =
    (await model.generateCompletion(prompt, params, options)) ?? EMPTY_AI_RESPONSE;

  return { output, tokens, queryTokens, answerTokens };
};

export const consumeResources = async (
  reference: string,
  runtime: Runtime,
  model: AIModel | null,
  resources: { tokens?: number; queryTokens?: number; answerTokens?: number } | null
) => {
  const { tokens = 0, queryTokens = 0, answerTokens = 0 } = resources ?? {};
  const multiplier = model?.tokenMultiplier ?? 1;
  const baseTokens = multiplier === 0 ? 0 : Math.ceil(tokens / multiplier);
  const baseQueryTokens = multiplier === 0 ? 0 : Math.ceil(queryTokens / multiplier);
  const baseAnswerTokens = multiplier === 0 ? 0 : Math.ceil(answerTokens / multiplier);

  const workspaceID = runtime.project?.teamID;

  if (typeof tokens === 'number' && tokens > 0) {
    await runtime.services.billing
      .consumeQuota(workspaceID, QuotaName.OPEN_API_TOKENS, tokens)
      .catch((err: Error) =>
        log.error(`[${reference}] Error consuming quota for workspace ${workspaceID}: ${log.vars({ err })}`)
      );
  }

  runtime.trace.debug(
    `__${reference}__
    <br /> Model: \`${model?.modelRef}\`
    <br /> Token Multiplier: \`${multiplier}x\`
    <br /> Token Consumption: \`{total: ${baseTokens}, query: ${baseQueryTokens}, answer: ${baseAnswerTokens}}\`
    <br /> Post-Multiplier Token Consumption: \`{total: ${tokens}, query: ${queryTokens}, answer: ${answerTokens}}\``
  );
};

export const checkTokens = async (runtime: Runtime, nodeType?: BaseNode.NodeType) => {
  const workspaceID = runtime.project?.teamID;

  if (await runtime.services.billing.checkQuota(workspaceID, QuotaName.OPEN_API_TOKENS)) return true;

  runtime.trace.debug('token quota exceeded', nodeType);
  return false;
};
