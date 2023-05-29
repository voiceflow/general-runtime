import { BaseUtils } from '@voiceflow/base-types';
import { AIModelParams } from '@voiceflow/base-types/build/cjs/utils/ai';
import { ChatCompletionRequestMessageRoleEnum } from '@voiceflow/openai';

import log from '@/logger';

import { Message } from '../types';
import { GPTAIModel } from './utils';

export class GPT3 extends GPTAIModel {
  public modelName = BaseUtils.ai.GPT_MODEL.DaVinci_003;

  static messagesToPrompt(messages: Message[]) {
    if (messages.length === 1) {
      return `${messages[0].content.trim()}\n`;
    }

    const transcript = messages
      .map((message) => {
        if (message.role === ChatCompletionRequestMessageRoleEnum.User) {
          return `user: ${message.content}\n`;
        }
        if (message.role === ChatCompletionRequestMessageRoleEnum.Assistant) {
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
          model: this.modelName,
          ...params,
          prompt,
        },
        { timeout: this.TIMEOUT }
      )
      .catch((error) => {
        log.warn(`GPT3 completion ${log.vars({ error, prompt, params })})}`);
        return null;
      });

    return result?.data.choices[0].text ?? null;
  }

  // turn messages into a singular prompt
  async generateChatCompletion(messages: Message[], params: AIModelParams) {
    return this.generateCompletion(GPT3.messagesToPrompt(messages), params);
  }
}
