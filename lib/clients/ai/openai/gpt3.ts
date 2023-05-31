import { BaseUtils } from '@voiceflow/base-types';
import { AIModelParams } from '@voiceflow/base-types/build/cjs/utils/ai';

import log from '@/logger';

import { GPTAIModel } from './utils';

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

    return result?.data.choices[0].text ?? null;
  }

  // turn messages into a singular prompt
  async generateChatCompletion(messages: BaseUtils.ai.Message[], params: AIModelParams) {
    return this.generateCompletion(GPT3.messagesToPrompt(messages), params);
  }
}
