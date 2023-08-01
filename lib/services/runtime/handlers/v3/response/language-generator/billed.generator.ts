import { BaseNode } from '@voiceflow/base-types';
import { InternalException } from '@voiceflow/exception';

import { QuotaName } from '@/lib/services/billing';
import { addOutputTrace, getOutputTrace } from '@/lib/services/runtime/utils';
import log from '@/logger';
import { Runtime } from '@/runtime';

import { generateOutput } from '../../../utils/output';
import { AIBillingEvents } from './billed.interface';
import { LanguageGenerator } from './language-generator.interface';

export class BilledGenerator<T extends Record<string, any>> implements LanguageGenerator<T> {
  constructor(private readonly runtime: Runtime, private readonly origGenerator: LanguageGenerator<T>) {}

  private async checkTokensQuota() {
    const workspaceID = this.runtime.project?.teamID;
    const isQuotaAvailable = await this.runtime.services.billing.checkQuota(workspaceID, QuotaName.OPEN_API_TOKENS);

    if (!isQuotaAvailable) {
      this.runtime.trace.debug('prompt response failed: token quota exceeded', BaseNode.NodeType.AI_SET);
      addOutputTrace(
        this.runtime,
        getOutputTrace({
          output: generateOutput('prompt response failed: [token quota exceeded]', this.runtime.project),
          version: this.runtime.version,
          ai: true,
        })
      );
    }

    return isQuotaAvailable;
  }

  private async consumeTokens(tokens: number) {
    const workspaceID = this.runtime.project?.teamID;
    return this.runtime.services.billing
      .consumeQuota(workspaceID, QuotaName.OPEN_API_TOKENS, tokens)
      .catch((err: Error) => {
        log.warn(`Failed to charge tokens for workspaceID=${workspaceID}, error=${JSON.stringify(err)}`);
      });
  }

  public async generate(prompt: string, settings: T) {
    if (!(await this.checkTokensQuota())) {
      throw new InternalException({
        message: 'token quota exceeded, could not resolved prompt-type response',
        details: { event: AIBillingEvents.QUOTA_EXCEEDED },
      });
    }

    const result = await this.origGenerator.generate(prompt, settings);

    if (result.tokens > 0) {
      this.consumeTokens(result.tokens);
    }

    return result;
  }
}
