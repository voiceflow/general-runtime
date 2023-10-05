import AnthropicApi from '@anthropic-ai/sdk';
import { OpenAIApi } from '@voiceflow/openai';

export type APIClient = OpenAIApi | AnthropicApi;

export interface CompletionOutput {
  output: string | null;
  tokens: number;
  queryTokens: number;
  answerTokens: number;
}

export interface CompletionOptions {
  retries?: number;
  retryDelay?: number;
}

export interface AIModelContext {
  workspaceID?: string;
  projectID?: string;
}

export const GPT4_ABLE_PLAN = new Set(['old_pro', 'old_team', 'pro', 'team', 'enterprise']);
