import { BaseUtils } from '@voiceflow/base-types';
import { replaceVariables, sanitizeVariables } from '@voiceflow/common';
import { AIModel } from '@voiceflow/dtos';
import { from, lastValueFrom, reduce } from 'rxjs';

import { CompletionOptions, GPT4_ABLE_PLAN } from '@/lib/clients/ai/ai-model.interface';
import MLGateway from '@/lib/clients/ml-gateway';
import { Runtime } from '@/runtime';

import AIAssist from '../../../aiAssist';

const MODEL_TO_ENTITLEMENT = new Map<AIModel, string>([
  [AIModel.GPT_4, 'feat-model-gpt-4'],
  [AIModel.GPT_4_TURBO, 'feat-model-gpt-4-turbo'],
  [AIModel.GPT_3_5_TURBO, 'feat-model-gpt-3-5-turbo'],
  [AIModel.CLAUDE_V2, 'feat-model-claude-2'],
  [AIModel.CLAUDE_V1, 'feat-model-claude-1'],
  [AIModel.CLAUDE_INSTANT_V1, 'feat-model-claude-instant'],
  [AIModel.CLAUDE_3_HAIKU, 'feat-model-claude-haiku'],
  [AIModel.CLAUDE_3_SONNET, 'feat-model-claude-sonnet'],
  [AIModel.CLAUDE_3_OPUS, 'feat-model-claude-opus'],
  [AIModel.GPT_4O, 'feat-model-gpt-4o'],
]);

export const getMemoryMessages = (variablesState: Record<string, unknown>) => [
  ...((variablesState?.[AIAssist.StorageKey] as BaseUtils.ai.Message[]) || []),
];

export const canUseModel = (model: BaseUtils.ai.GPT_MODEL, runtime: Runtime) => {
  // TODO remove once we remove teams table
  if (
    ![AIModel.GPT_4, AIModel.GPT_4_TURBO, AIModel.GPT_4O, AIModel.CLAUDE_3_SONNET, AIModel.CLAUDE_3_OPUS].includes(
      model as any
    )
  ) {
    return true;
  }
  // TODO remove once we remove teams table
  if (runtime.plan) {
    // if not restricted models
    if (
      ![AIModel.GPT_4, AIModel.GPT_4_TURBO, AIModel.GPT_4O, AIModel.CLAUDE_3_SONNET, AIModel.CLAUDE_3_OPUS].includes(
        model as any
      )
    ) {
      return true;
    }
    // if restricted model but plan allows
    if (GPT4_ABLE_PLAN.has(runtime.plan)) return true;

    return false;
  }

  if (runtime.subscriptionEntitlements) {
    const modelEntitlementName = MODEL_TO_ENTITLEMENT.get(model);
    return runtime.subscriptionEntitlements.some(
      (entitlement) => entitlement.feature_id === modelEntitlementName && entitlement.value === 'true'
    );
  }

  return false;
};

export interface AIResponse {
  output: string | null;
  messages?: BaseUtils.ai.Message[];
  prompt?: string;
  tokens: number;
  queryTokens: number;
  answerTokens: number;
  model: string;
  multiplier: number;
}

export const EMPTY_AI_RESPONSE: AIResponse = {
  output: null,
  tokens: 0,
  queryTokens: 0,
  answerTokens: 0,
  model: '',
  multiplier: 1,
};

export async function* fetchChatStream(
  params: BaseUtils.ai.AIModelParams & { messages: BaseUtils.ai.Message[] },
  mlGateway: MLGateway,
  options: CompletionOptions,
  variablesState: Record<string, unknown> = {}
): AsyncGenerator<AIResponse> {
  if (!mlGateway.private) {
    yield EMPTY_AI_RESPONSE;
    return;
  }

  const sanitizedVars = sanitizeVariables(variablesState);
  const messages = params.messages.map((message) => ({
    ...message,
    content: replaceVariables(message.content, sanitizedVars),
  }));

  yield* mlGateway.private.completion.generateChatCompletionStream({
    messages,
    params: { ...params, system: replaceVariables(params.system, sanitizedVars) },
    options,
    workspaceID: options.context.workspaceID,
    projectID: options.context.projectID,
    moderation: true,
    billing: true,
  });
}

export const fetchChat = async (
  params: BaseUtils.ai.AIModelParams & { messages: BaseUtils.ai.Message[] },
  mlGateway: MLGateway,
  options: CompletionOptions,
  variablesState: Record<string, unknown> = {}
): Promise<AIResponse> => {
  return lastValueFrom(
    from(fetchChatStream(params, mlGateway, options, variablesState)).pipe(
      reduce((acc, completion) => {
        if (!acc.output) acc.output = '';

        acc.output += completion.output ?? '';
        acc.answerTokens += completion.answerTokens;
        acc.queryTokens += completion.queryTokens;
        acc.tokens += completion.tokens;
        acc.model = completion.model;
        acc.multiplier = completion.multiplier;
        return acc;
      }, EMPTY_AI_RESPONSE)
    )
  );
};

export async function* fetchPromptStream(
  params: BaseUtils.ai.AIModelParams & { mode?: BaseUtils.ai.PROMPT_MODE; prompt?: string },
  mlGateway: MLGateway,
  options: CompletionOptions,
  variablesState: Record<string, unknown> = {}
) {
  if (!mlGateway.private) {
    yield EMPTY_AI_RESPONSE;
    return;
  }

  const sanitizedVars = sanitizeVariables(variablesState);

  const prompt = replaceVariables(params.prompt, sanitizedVars);

  let messages: BaseUtils.ai.Message[] = [];

  if (params.mode === BaseUtils.ai.PROMPT_MODE.MEMORY) {
    messages = getMemoryMessages(variablesState);
  } else if (params.mode === BaseUtils.ai.PROMPT_MODE.MEMORY_PROMPT) {
    messages = getMemoryMessages(variablesState);
    if (prompt) messages.push({ role: BaseUtils.ai.Role.USER, content: prompt });
  } else if (!prompt) {
    yield EMPTY_AI_RESPONSE;
    return;
  } else {
    messages = [{ role: BaseUtils.ai.Role.USER, content: prompt }];
  }

  yield* mlGateway.private.completion.generateChatCompletionStream({
    messages,
    params: {
      ...params,
      system: replaceVariables(params.system, sanitizedVars),
    },
    workspaceID: options.context.workspaceID,
    projectID: options.context.projectID,
    moderation: true,
    billing: true,
    options,
  });
}

export const fetchPrompt = async (
  params: BaseUtils.ai.AIModelParams & { mode: BaseUtils.ai.PROMPT_MODE; prompt: string },
  mlGateway: MLGateway,
  options: CompletionOptions,
  variablesState: Record<string, unknown> = {}
): Promise<AIResponse> => {
  if (!mlGateway.private) return EMPTY_AI_RESPONSE;

  const sanitizedVars = sanitizeVariables(variablesState);

  const prompt = replaceVariables(params.prompt, sanitizedVars);

  let messages: BaseUtils.ai.Message[] = [];

  if (params.mode === BaseUtils.ai.PROMPT_MODE.MEMORY) {
    messages = getMemoryMessages(variablesState);
  } else if (params.mode === BaseUtils.ai.PROMPT_MODE.MEMORY_PROMPT) {
    messages = getMemoryMessages(variablesState);
    if (prompt) messages.push({ role: BaseUtils.ai.Role.USER, content: prompt });
  } else if (!prompt) {
    return EMPTY_AI_RESPONSE;
  } else {
    messages = [{ role: BaseUtils.ai.Role.USER, content: prompt }];
  }

  const { output, tokens, queryTokens, answerTokens, model, multiplier } =
    (await mlGateway.private.completion.generateChatCompletion({
      messages,
      params: {
        ...params,
        system: replaceVariables(params.system, sanitizedVars),
      },
      workspaceID: options.context.workspaceID,
      projectID: options.context.projectID,
      moderation: true,
      billing: true,
      options,
    })) ?? EMPTY_AI_RESPONSE;

  return { output, tokens, queryTokens, answerTokens, model, multiplier };
};

export const consumeResources = async (
  reference: string,
  runtime: Runtime,
  resources: { tokens?: number; queryTokens?: number; answerTokens?: number; model: string; multiplier: number } | null
) => {
  if (!resources) return;

  const { tokens = 0, queryTokens = 0, answerTokens = 0, model } = resources ?? {};
  const multiplier = resources?.multiplier ?? 1;
  const baseTokens = multiplier === 0 ? 0 : Math.ceil(tokens / multiplier);
  const baseQueryTokens = multiplier === 0 ? 0 : Math.ceil(queryTokens / multiplier);
  const baseAnswerTokens = multiplier === 0 ? 0 : Math.ceil(answerTokens / multiplier);

  runtime.trace.debug(
    `__${reference}__
    <br /> Model: \`${model}\`
    <br /> Token Multiplier: \`${multiplier}x\`
    <br /> Token Consumption: \`{total: ${baseTokens}, query: ${baseQueryTokens}, answer: ${baseAnswerTokens}}\`
    <br /> Post-Multiplier Token Consumption: \`{total: ${tokens}, query: ${queryTokens}, answer: ${answerTokens}}\``
  );
};
