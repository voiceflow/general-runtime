import { AIModel } from "@voiceflow/dtos";

export type PromptWrapperModelParams = {temperature: number; model: AIModel; system: string; maxTokens: number};

export type PromptWrapperSlotMap = Record<string,{type?: string; examples?: string[]}>;

export type PromptWrapperContext = { projectID: string; workspaceID: string };

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
