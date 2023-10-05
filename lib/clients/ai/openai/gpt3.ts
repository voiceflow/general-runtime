import { BaseUtils } from '@voiceflow/base-types';
import { AIModelParams } from '@voiceflow/base-types/build/cjs/utils/ai';

import log from '@/logger';

import { GPTAIModel } from './gpt';

export class GPT3 extends GPTAIModel {
  public modelRef = BaseUtils.ai.GPT_MODEL.DaVinci_003;

  protected gptModelName = 'text-davinci-003';

  static messagesToPrompt(messages: BaseUtils.ai.Message[]) {
    if (messages.length === 1) {
      return `${messages[0].content.trim()}\n`;
    }

    const transcript = messages
      .map((message) => {
        if (message.role === BaseUtils.ai.Role.USER) {
          return `user: ${message.content}\n`;
        }
        if (message.role === BaseUtils.ai.Role.ASSISTANT) {
          return `bot: ${message.content}\n`;
        }
        return `${message.content}\n\n`;
      })
      .join();

    return `${transcript.trim()}\nuser: `;
  }

  async generateCompletion(prompt: string, params: AIModelParams) {
    await this.contentModerationClient.checkModeration(prompt, this.context);

    const result = await this.client
      .createCompletion(
        {
          model: this.gptModelName,
          max_tokens: params.maxTokens,
          temperature: params.temperature,
          prompt,
        },
        { timeout: this.TIMEOUT }
      )
      .catch((error) => {
        log.warn(`GPT3 completion ${log.vars({ error, prompt, params, data: error?.response?.data?.error })})}`);
        return null;
      });

    const output = result?.data.choices[0].text ?? null;
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

  // turn messages into a singular prompt
  async generateChatCompletion(messages: BaseUtils.ai.Message[], params: AIModelParams) {
    return this.generateCompletion(GPT3.messagesToPrompt(messages), params);
  }
}
