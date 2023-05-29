/* eslint-disable max-classes-per-file */
import { BaseUtils } from '@voiceflow/base-types';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export abstract class AIModel {
  public abstract modelName: BaseUtils.ai.GPT_MODEL;

  abstract generateCompletion(prompt: string, params: BaseUtils.ai.AIModelParams): Promise<string | null>;

  abstract generateChatCompletion(messages: Message[], params: BaseUtils.ai.AIModelParams): Promise<string | null>;
}

export abstract class GPTAIModel extends AIModel {
  private deployments: string[] = [];

  setDeployments(deployments: string) {
    this.deployments = deployments.split(',');
  }

  get deployment() {
    return this.deployments[Math.floor(Math.random() * this.deployments.length)];
  }
}
