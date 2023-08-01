import { promptSynthesis } from '../../../utils/knowledgeBase';
import { AnswerReturn, KnowledgeBaseConfig, KnowledgeBaseGenerator, KnowledgeBaseSettings } from './kb.interface';

export class KnowledgeBase implements KnowledgeBaseGenerator {
  constructor(private readonly knowledgeBaseConfig: KnowledgeBaseConfig) {}

  public async generate(
    prompt: string,
    { /* $TODO$ chatHistory, */ variableMap }: KnowledgeBaseSettings
  ): Promise<AnswerReturn> {
    const result = await promptSynthesis(
      this.knowledgeBaseConfig.project._id,
      {
        ...this.knowledgeBaseConfig.kbStrategy.summarization,
        prompt,
      },
      variableMap
    );

    const tokensConsumed = result && typeof result.tokens === 'number' && result.tokens > 0 ? result.tokens : 0;

    // $TODO$ - Need this?
    // const output = generateOutput(
    //   result?.output ?? 'Unable to find relevant answer.',
    //   this.knowledgeBaseConfig.project,
    //   '' // $TODO$ - This might have to be different when running Response step for Voice projects
    // );

    return {
      tokens: tokensConsumed,
      output: result?.output ?? null,
    };
  }
}
