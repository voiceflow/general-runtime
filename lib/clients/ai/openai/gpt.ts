// eslint-disable-next-line max-classes-per-file
import { BaseUtils } from '@voiceflow/base-types';
import type { AIModelParams } from '@voiceflow/base-types/build/cjs/utils/ai';
import { ChatCompletionRequestMessageRoleEnum } from '@voiceflow/openai';

import { Config } from '@/types';

import { AIModel } from '../ai-model';
import type { CompletionOptions } from '../ai-model.interface';
import type { ContentModerationClient } from '../contentModeration';
import { OpenAIClient } from './api-client';

export abstract class GPTAIModel extends AIModel {
  protected abstract gptModelName: string;

  protected readonly client: OpenAIClient;

  static RoleMapping = {
    [BaseUtils.ai.Role.ASSISTANT]: ChatCompletionRequestMessageRoleEnum.Assistant,
    [BaseUtils.ai.Role.SYSTEM]: ChatCompletionRequestMessageRoleEnum.System,
    [BaseUtils.ai.Role.USER]: ChatCompletionRequestMessageRoleEnum.User,
  };

  constructor(config: Config, protected readonly contentModerationClient: ContentModerationClient | null) {
    super(config);
    this.client = new OpenAIClient(config);
  }

  protected calculateTokenMultiplier(tokens: number): number {
    return Math.ceil(tokens * this.TOKEN_MULTIPLIER);
  }
}

export abstract class GPTAIChatModel extends GPTAIModel {
  async generateCompletion(prompt: string, params: AIModelParams, options: CompletionOptions) {
    const messages: BaseUtils.ai.Message[] = [{ role: BaseUtils.ai.Role.USER, content: prompt }];
    if (params.system) messages.unshift({ role: BaseUtils.ai.Role.SYSTEM, content: params.system });

    return this.generateChatCompletion(messages, params, options);
  }
}
