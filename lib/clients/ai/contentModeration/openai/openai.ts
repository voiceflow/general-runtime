import { Configuration, OpenAIApi } from '@voiceflow/openai';

import { FeatureFlag } from '@/lib/feature-flags';
import log from '@/logger';
import { Config } from '@/types';

import UnleashClient from '../../../unleash';
import { AIModelContext } from '../../ai-model.interface';
import ContentModerationClient from '..';
import { ContentModerationError } from '../utils';

// if the OPENAI_API_KEY is not set, the content moderation is just ignored
export class OpenAIModerationClient extends ContentModerationClient {
  protected openAIClient?: OpenAIApi;

  constructor(config: Config, unleashClient: UnleashClient) {
    super(config, unleashClient);
    if (config.OPENAI_API_KEY) {
      this.openAIClient = new OpenAIApi(
        new Configuration({ apiKey: config.OPENAI_API_KEY, basePath: config.OPENAI_API_ENDPOINT ?? undefined })
      );
    }
  }

  async checkModeration(input: string | string[], context?: AIModelContext) {
    if (!this.unleashClient.isEnabled(FeatureFlag.LLM_MODERATION_FAIL_FF)) return;
    if (!this.openAIClient) return;

    if (!input?.length) return;
    const moderationResult = await this.openAIClient.createModeration({ input });

    const failedModeration = moderationResult.data.results.flatMap((result, idx) => {
      if (result.flagged) {
        return [
          {
            input: Array.isArray(input) ? input[idx] : input,
            projectID: context?.projectID,
            workspaceID: context?.workspaceID,
            error: result,
          },
        ];
      }
      return [];
    });

    failedModeration.forEach((failedModeration) => {
      const failedModerationCategories = Object.entries(failedModeration.error.categories).reduce<string[]>(
        (acc, [key, value]) => {
          if (value) acc.push(key);
          return acc;
        },
        []
      );
      log.warn(
        `[moderation error]input=${failedModeration.input} | categories=${failedModerationCategories} | projectID=${context?.projectID} | workspaceID=${context?.workspaceID}`
      );
    });

    if (failedModeration.length) {
      throw new ContentModerationError(failedModeration);
    }
  }
}
