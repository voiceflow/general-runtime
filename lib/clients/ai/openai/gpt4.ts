import { BaseUtils } from '@voiceflow/base-types';
import { AIModelParams } from '@voiceflow/base-types/build/cjs/utils/ai';

import log from '@/logger';
import { Config } from '@/types';

import { CompletionOptions } from '../ai-model.interface';
import { ContentModerationClient } from '../contentModeration';
import { OpenAIClient } from './api-client';
import { GPTAIChatModel } from './gpt';

export class GPT4 extends GPTAIChatModel {
  TOKEN_MULTIPLIER = 25;

  public modelRef = BaseUtils.ai.GPT_MODEL.GPT_4;

  protected gptModelName = 'gpt-4';

  protected readonly client: OpenAIClient;

  constructor(config: Config, protected readonly contentModerationClient: ContentModerationClient | null) {
    super(config, contentModerationClient);

    this.client = new OpenAIClient(config);
  }

  async generateChatCompletion(messages: BaseUtils.ai.Message[], params: AIModelParams, options: CompletionOptions) {
    await this.contentModerationClient?.checkModeration(
      messages.map((message) => message.content),
      options.context
    );

    // we dont have access to GPT 4 on Azure yet, use OpenAI API instead
    if (!this.client.openAIClient) {
      log.warn('Cant use GPT4 completion as no valid openAI configuration is set');
      return null;
    }
    const result = await this.client.openAIClient
      .createChatCompletion(
        {
          model: this.gptModelName,
          max_tokens: params.maxTokens,
          temperature: params.temperature,
          messages: messages.map(({ role, content }) => ({ role: GPTAIChatModel.RoleMapping[role], content })),
        },
        { timeout: options.timeout ?? this.TIMEOUT }
      )
      .catch((error) => {
        log.warn(`GPT4 completion ${log.vars({ error, messages, params, data: error?.response?.data?.error })})}`);
        return null;
      });

    const output = result?.data.choices[0].message?.content ?? null;
    const tokens = result?.data.usage?.total_tokens ?? 0;
    const queryTokens = result?.data.usage?.prompt_tokens ?? 0;
    const answerTokens = result?.data.usage?.completion_tokens ?? 0;

    return {
      output,
      tokens: this.calculateTokenMultiplier(tokens),
      queryTokens: this.calculateTokenMultiplier(queryTokens),
      answerTokens: this.calculateTokenMultiplier(answerTokens),
    };
  }
}
