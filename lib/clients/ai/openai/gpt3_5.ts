import { BaseUtils } from '@voiceflow/base-types';
import { AIModelParams } from '@voiceflow/base-types/build/cjs/utils/ai';

import log from '@/logger';

import { CompletionOutput } from '../types';
import { GPTAIModel } from './utils';

export class GPT3_5 extends GPTAIModel {
  public modelRef = BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo;

  protected gptModelName = 'gpt-3.5-turbo';

  async generateCompletion(prompt: string, params: AIModelParams) {
    const messages: BaseUtils.ai.Message[] = [{ role: BaseUtils.ai.Role.USER, content: prompt }];
    if (params.system) messages.unshift({ role: BaseUtils.ai.Role.SYSTEM, content: params.system });

    return this.generateChatCompletion(messages, params);
  }

  async generateChatCompletion(
    messages: BaseUtils.ai.Message[],
    params: AIModelParams,
    client = this.client
  ): Promise<CompletionOutput | null> {
    try {
      const result = await client.createChatCompletion(
        {
          model: this.gptModelName,
          max_tokens: params.maxTokens,
          temperature: params.temperature,
          messages: messages.map(({ role, content }) => ({ role: GPTAIModel.RoleMapping[role], content })),
        },
        { timeout: this.TIMEOUT }
      );

      const output = result?.data.choices[0].message?.content ?? null;
      const tokens = result.data.usage?.total_tokens ?? 0;

      return {
        output,
        tokens: this.calculateTokenMultiplier(tokens),
      };
    } catch (error) {
      const truncatedMessages = messages.slice(0, 10).map(({ content, ...rest }) => ({
        ...rest,
        content: content.substring(0, 200),
      }));
      log.warn(
        `GPT3.5 completion ${log.vars({
          error: error?.response ?? error,
          messages: truncatedMessages,
          params,
        })})}`
      );

      // if we fail on the azure instance due to rate limiting, retry with OpenAI API
      if (client === this.azureClient && error?.response?.status === 429 && this.openAIClient) {
        return this.generateChatCompletion(messages, params, this.openAIClient);
      }

      return null;
    }
  }
}
