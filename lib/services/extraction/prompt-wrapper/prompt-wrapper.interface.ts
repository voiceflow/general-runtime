import { AIModel } from '@voiceflow/dtos';

export interface PromptWrapperModelParams {
  temperature: number;
  model: AIModel;
  system: string;
  maxTokens: number;
}

export type PromptWrapperSlotMap = Record<string, { type?: string; examples?: string[] }>;

export interface PromptWrapperContext {
  projectID: string;
  workspaceID: string;
}

export interface PromptWrapperExtractionResult {
  type: string;
  entityState: any;
  rationale: string;
  response: string;
}

export interface PromptWrapperSideEffects {
  tokens: number;
  answerTokens: number;
  queryTokens: number;
  multiplier: number;
}
