/* eslint-disable sonarjs/no-nested-template-literals */
import { AI_PROMPT, HUMAN_PROMPT } from '@anthropic-ai/sdk';
import { BaseUtils } from '@voiceflow/base-types';
import { AIModelParams } from '@voiceflow/base-types/build/cjs/utils/ai';

import log from '@/logger';

import { AIModel } from '../ai-model';
import { CompletionOptions, CompletionOutput } from '../ai-model.interface';
import { ContentModerationClient } from '../contentModeration';
import { AnthropicConfig } from './anthropic.interface';
import { AnthropicAIClient } from './api-client';

export abstract class AnthropicAIModel extends AIModel {
  protected abstract anthropicModel: string;

  protected readonly client: AnthropicAIClient;

  protected maxTokens = 128;

  constructor(config: AnthropicConfig, protected readonly contentModerationClient: ContentModerationClient | null) {
    super(config);

    this.client = new AnthropicAIClient(config);
  }

  static RoleMap = {
    [BaseUtils.ai.Role.SYSTEM]: HUMAN_PROMPT,
    [BaseUtils.ai.Role.USER]: HUMAN_PROMPT,
    [BaseUtils.ai.Role.ASSISTANT]: AI_PROMPT,
  };

  generateCompletion(
    prompt: string,
    params: AIModelParams,
    options: CompletionOptions
  ): Promise<CompletionOutput | null> {
    const messages: BaseUtils.ai.Message[] = [{ role: BaseUtils.ai.Role.USER, content: prompt }];
    if (params.system) messages.unshift({ role: BaseUtils.ai.Role.SYSTEM, content: params.system });

    return this.generateChatCompletion(messages, params, options);
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
    params: AIModelParams,
    options: CompletionOptions
  ): Promise<CompletionOutput | null> {
    let topSystem = '';
    if (messages[0]?.role === BaseUtils.ai.Role.SYSTEM) {
      topSystem = messages.shift()!.content;
    }

    const prompt = `${topSystem}\n\n${messages.map(
      (message) => `${AnthropicAIModel.RoleMap[message.role]} ${message.content}`
    )}${AI_PROMPT}`;

    await this.contentModerationClient?.checkModeration(prompt, options.context);

    const queryTokens = this.calculateTokenUsage(prompt);

    const result = await this.client.client.completions
      .create({
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

    return {
      output,
      tokens: queryTokens + answerTokens,
      queryTokens,
      answerTokens,
    };
  }
}
