import { BaseUtils } from '@voiceflow/base-types';
import { PlanType } from '@voiceflow/internal';
import { expect } from 'chai';

import { canUseModel } from '@/lib/services/runtime/handlers/utils/ai';
import { Runtime, SubscriptionEntitlements } from '@/runtime';

describe('runtime handler utils unit tests', () => {
  describe('canUseModel', () => {
    it('returns true on non GPT-4 models', () => {
      expect(canUseModel(BaseUtils.ai.GPT_MODEL.CLAUDE_INSTANT_V1, {} as Runtime)).to.eql(true);
      expect(canUseModel(BaseUtils.ai.GPT_MODEL.CLAUDE_V1, {} as Runtime)).to.eql(true);
      expect(canUseModel(BaseUtils.ai.GPT_MODEL.CLAUDE_V2, {} as Runtime)).to.eql(true);
      expect(canUseModel(BaseUtils.ai.GPT_MODEL.DaVinci_003, {} as Runtime)).to.eql(true);
      expect(canUseModel(BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo, {} as Runtime)).to.eql(true);
    });

    it('returns true if runtime plan supports GPT-4', () => {
      expect(canUseModel(BaseUtils.ai.GPT_MODEL.GPT_4, { plan: PlanType.PRO } as Runtime)).to.eql(true);
      expect(canUseModel(BaseUtils.ai.GPT_MODEL.GPT_4, { plan: PlanType.PRO } as Runtime)).to.eql(true);
    });

    it("returns false if runtime subscription entitlements doesn't supports GPT-4", () => {
      const runtime = { subscriptionEntitlements: [] as SubscriptionEntitlements } as Runtime;

      expect(canUseModel(BaseUtils.ai.GPT_MODEL.GPT_4, runtime)).to.eql(false);
      expect(canUseModel(BaseUtils.ai.GPT_MODEL.GPT_4_turbo, runtime)).to.eql(false);
    });

    it('returns true if runtime subscription entitlements support GPT-4', () => {
      const gpt4EnabledRuntime = {
        subscriptionEntitlements: [{ feature_id: 'feat-model-gpt-4', value: 'true' }],
      } as Runtime;
      const gpt4TurboEnabledRuntime = {
        subscriptionEntitlements: [{ feature_id: 'feat-model-gpt-4-turbo', value: 'true' }],
      } as Runtime;

      expect(canUseModel(BaseUtils.ai.GPT_MODEL.GPT_4, gpt4EnabledRuntime)).to.eql(true);
      expect(canUseModel(BaseUtils.ai.GPT_MODEL.GPT_4_turbo, gpt4TurboEnabledRuntime)).to.eql(true);
    });
  });
});
