/* eslint-disable sonarjs/no-nested-template-literals */
import { AI_PROMPT, Client, HUMAN_PROMPT } from '@voiceflow/anthropic';
import { BaseUtils } from '@voiceflow/base-types';
import { AIModelParams } from '@voiceflow/base-types/build/cjs/utils/ai';

import log from '@/logger';
import { Config } from '@/types';

import { AIModel, CompletionOutput } from '../types';

export abstract class AnthropicAIModel extends AIModel {
  protected client: Client;

  protected abstract anthropicModel: string;

  protected maxTokens = 128;

  constructor(config: Partial<Config>) {
    super();

    if (!config.ANTHROPIC_API_KEY) {
      throw new Error(`Anthropic client not initialized`);
    }

    this.client = new Client(config.ANTHROPIC_API_KEY);
  }

  static RoleMap = {
    [BaseUtils.ai.Role.SYSTEM]: HUMAN_PROMPT,
    [BaseUtils.ai.Role.USER]: HUMAN_PROMPT,
    [BaseUtils.ai.Role.ASSISTANT]: AI_PROMPT,
  };

  generateCompletion(prompt: string, params: AIModelParams): Promise<CompletionOutput | null> {
    const messages: BaseUtils.ai.Message[] = [{ role: BaseUtils.ai.Role.USER, content: prompt }];
    if (params.system) messages.unshift({ role: BaseUtils.ai.Role.SYSTEM, content: params.system });

    return this.generateChatCompletion(messages, params);
  }

  /**
   * Approximate the number of tokens used by the model based on the text length.
   * Uses 4 tokens per character as a rough estimate.
   */
  private calculateTokenUsage(text: string): number {
    return Math.floor((text.length / 4) * this.TOKEN_MULTIPLIER);
  }

  async generateChatCompletion(
    messages: BaseUtils.ai.Message[],
    params: AIModelParams
  ): Promise<CompletionOutput | null> {
    let topSystem = '';
    if (messages[0]?.role === BaseUtils.ai.Role.SYSTEM) {
      topSystem = messages.shift()!.content;
    }

    const prompt = `${topSystem}\n\n${messages.map(
      (message) => `${AnthropicAIModel.RoleMap[message.role]} ${message.content}`
    )}${AI_PROMPT}`;

    const queryTokens = this.calculateTokenUsage(prompt);
    let tokens = queryTokens;

    const result = await this.client
      .complete({
        prompt,
        model: this.anthropicModel,
        temperature: params.temperature,
        max_tokens_to_sample: params.maxTokens || this.maxTokens,
        stop_sequences: [HUMAN_PROMPT],
      })
      .catch((error) => {
        log.warn(`${this.modelRef} completion ${log.vars({ error, messages, params })})}`);
        return null;
      });

    const output = result?.completion?.trim() ?? null;

    const answerTokens = this.calculateTokenUsage(output ?? '');
    tokens += this.calculateTokenUsage(output ?? '');

    return {
      output,
      tokens,
      queryTokens,
      answerTokens,
    };
  }
}
