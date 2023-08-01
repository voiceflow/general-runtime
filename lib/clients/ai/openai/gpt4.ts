import { BaseUtils } from '@voiceflow/base-types';
import { AIModelParams } from '@voiceflow/base-types/build/cjs/utils/ai';

import log from '@/logger';
import { Config } from '@/types';

import { GPTAIModel } from './utils';

export class GPT4 extends GPTAIModel {
  TOKEN_MULTIPLIER = 25;

  public modelRef = BaseUtils.ai.GPT_MODEL.GPT_4;

  protected gptModelName = 'gpt-4';

  constructor(config: Config) {
    // we dont not have access to GPT 4 on Azure yet, use OpenAI API instead
    super({ OPENAI_API_KEY: config.OPENAI_API_KEY });
  }

  async generateCompletion(prompt: string, params: AIModelParams) {
    const messages: BaseUtils.ai.Message[] = [{ role: BaseUtils.ai.Role.USER, content: prompt }];
    if (params.system) messages.unshift({ role: BaseUtils.ai.Role.SYSTEM, content: params.system });

    return this.generateChatCompletion(messages, params);
  }

  async generateChatCompletion(messages: BaseUtils.ai.Message[], params: AIModelParams) {
    const startTime = Date.now();
    const result = await this.client
      .createChatCompletion(
        {
          model: this.gptModelName,
          max_tokens: params.maxTokens,
          temperature: params.temperature,
          messages: messages.map(({ role, content }) => ({ role: GPTAIModel.RoleMapping[role], content })),
        },
        { timeout: this.TIMEOUT }
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
      time: Date.now() - startTime,
    };
  }
}
