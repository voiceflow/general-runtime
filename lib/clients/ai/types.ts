import { BaseUtils } from '@voiceflow/base-types';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export abstract class AIModel {
  public abstract modelName: BaseUtils.ai.GPT_MODEL;

  abstract generateCompletion(prompt: string, params: BaseUtils.ai.AIModelParams): Promise<string | null>;

  abstract generateChatCompletion(messages: Message[], params: BaseUtils.ai.AIModelParams): Promise<string | null>;
}
