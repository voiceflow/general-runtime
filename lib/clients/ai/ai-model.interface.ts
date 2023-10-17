import { PlanType } from '@voiceflow/internal';

import { AnthropicAIClient } from './anthropic/api-client';
import { OpenAIClient } from './openai/api-client';

export type APIClient = OpenAIClient | AnthropicAIClient;

export interface CompletionOutput {
  output: string | null;
  tokens: number;
  queryTokens: number;
  answerTokens: number;
}

export interface AIModelContext {
  workspaceID?: string;
  projectID?: string;
}
export interface CompletionOptions {
  context?: AIModelContext;
  retries?: number;
  retryDelay?: number;
}

export const GPT4_ABLE_PLAN = new Set([
  PlanType.OLD_PRO,
  PlanType.OLD_TEAM,
  PlanType.PRO,
  PlanType.TEAM,
  PlanType.ENTERPRISE,
]);
