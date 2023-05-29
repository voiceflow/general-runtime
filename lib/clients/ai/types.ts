import { BaseUtils } from '@voiceflow/base-types';
import { ChatCompletionRequestMessageRoleEnum } from '@voiceflow/openai';

export interface Message {
  role: ChatCompletionRequestMessageRoleEnum;
  content: string;
}

export abstract class AIModel {
  public abstract modelName: BaseUtils.ai.GPT_MODEL;

  protected TIMEOUT = 20000;

  abstract generateCompletion(prompt: string, params: BaseUtils.ai.AIModelParams): Promise<string | null>;

  abstract generateChatCompletion(messages: Message[], params: BaseUtils.ai.AIModelParams): Promise<string | null>;
}
