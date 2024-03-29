import { PlanType } from '@voiceflow/internal';

export interface CompletionOutput {
  output: string | null;
  tokens: number;
  queryTokens: number;
  answerTokens: number;
}

export interface AIModelContext {
  workspaceID: string;
  projectID?: string;
}
export interface CompletionOptions {
  context: AIModelContext;
  timeout?: number;
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
