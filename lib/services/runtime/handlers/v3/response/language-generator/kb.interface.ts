import { BaseModels, BaseUtils } from '@voiceflow/base-types';

import { LanguageGenerator } from './language-generator.interface';

export interface KnowledgeBaseSettings {
  chatHistory: BaseUtils.ai.Message[];
  variableMap: Record<string, any>;
}

export interface KnowledgeBaseConfig {
  documents: Record<string, BaseModels.Project.KnowledgeBaseDocument>;
  project: BaseModels.Project.Model<any, any>;
  kbStrategy: BaseModels.Project.KnowledgeBaseSettings;
}

export interface AnswerReturn {
  tokens: number;
  output: string | null;
}

export type KnowledgeBaseGenerator = LanguageGenerator<KnowledgeBaseSettings>;
