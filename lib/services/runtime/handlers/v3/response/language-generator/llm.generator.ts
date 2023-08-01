import { BaseUtils } from '@voiceflow/base-types';

import AI from '@/lib/clients/ai';

import { GenerateReturn, LLMGenerator, LLMSettings } from './llm.interface';

export class LLM implements LLMGenerator {
  private buildConversationHistory(prompt: string, system: string, messages: BaseUtils.ai.Message[]) {
    if (system.length) {
      messages.unshift({
        role: BaseUtils.ai.Role.SYSTEM,
        content: system,
      });
    }

    if (prompt.length) {
      messages.push({
        role: BaseUtils.ai.Role.USER,
        content: prompt,
      });
    }

    return messages;
  }

  public async generate(prompt: string, settings: LLMSettings): Promise<GenerateReturn> {
    const { model: modelName, temperature, maxTokens, system = '', chatHistory } = settings;

    const model = AI.get(modelName);

    if (!model) return { output: null, tokens: 0 };

    const conversationHistory = this.buildConversationHistory(prompt, system, chatHistory);

    const { output, tokens } = (await model.generateChatCompletion(conversationHistory, {
      temperature,
      maxTokens,
    })) ?? { output: null, tokens: 0 };

    return { output, tokens };
  }
}
