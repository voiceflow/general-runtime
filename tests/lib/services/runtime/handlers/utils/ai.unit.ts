import { AIModel } from '@voiceflow/dtos';
import { PlanType } from '@voiceflow/internal';
import { expect } from 'chai';

import { canUseModel } from '@/lib/services/runtime/handlers/utils/ai';
import { Runtime, SubscriptionEntitlements } from '@/runtime';

describe('runtime handler utils unit tests', () => {
  describe('canUseModel', () => {
    it('returns true on non GPT-4 models', () => {
      expect(canUseModel(AIModel.CLAUDE_INSTANT_V1 as any, {} as Runtime)).to.eql(true);
      expect(canUseModel(AIModel.CLAUDE_V1 as any, {} as Runtime)).to.eql(true);
      expect(canUseModel(AIModel.CLAUDE_V2 as any, {} as Runtime)).to.eql(true);
      expect(canUseModel(AIModel.GPT_3_5_TURBO as any, {} as Runtime)).to.eql(true);
    });

    it('returns true if runtime plan supports GPT-4', () => {
      expect(canUseModel(AIModel.GPT_4 as any, { plan: PlanType.PRO } as Runtime)).to.eql(true);
      expect(canUseModel(AIModel.GPT_4O as any, { plan: PlanType.PRO } as Runtime)).to.eql(true);
      expect(canUseModel(AIModel.GPT_4O_MINI as any, { plan: PlanType.PRO } as Runtime)).to.eql(true);
      expect(canUseModel(AIModel.GPT_4_TURBO as any, { plan: PlanType.PRO } as Runtime)).to.eql(true);
      expect(canUseModel(AIModel.GEMINI_PRO_1_5 as any, { plan: PlanType.PRO } as Runtime)).to.eql(true);
    });

    it("returns false if runtime subscription entitlements doesn't supports GPT-4", () => {
      const runtime = { subscriptionEntitlements: [] as SubscriptionEntitlements } as Runtime;

      expect(canUseModel(AIModel.GPT_4 as any, runtime)).to.eql(false);
      expect(canUseModel(AIModel.GPT_4O as any, runtime)).to.eql(false);
      expect(canUseModel(AIModel.GPT_4O_MINI as any, runtime)).to.eql(false);
      expect(canUseModel(AIModel.GPT_4_TURBO as any, runtime)).to.eql(false);
      expect(canUseModel(AIModel.GEMINI_PRO_1_5 as any, runtime)).to.eql(false);
    });

    it('returns true if runtime subscription entitlements support GPT-4', () => {
      const gpt4EnabledRuntime = {
        subscriptionEntitlements: [{ feature_id: 'feat-model-gpt-4', value: 'true' }],
      } as Runtime;
      const gpt4TurboEnabledRuntime = {
        subscriptionEntitlements: [{ feature_id: 'feat-model-gpt-4-turbo', value: 'true' }],
      } as Runtime;

      const gpt4OEnabledRuntime = {
        subscriptionEntitlements: [{ feature_id: 'feat-model-gpt-4o', value: 'true' }],
      } as Runtime;

      const gpt4OMiniEnabledRuntime = {
        subscriptionEntitlements: [{ feature_id: 'feat-model-gpt-4o-mini', value: 'true' }],
      } as Runtime;

      const geminiPro15EnabledRuntime = {
        subscriptionEntitlements: [{ feature_id: 'feat-model-gemini-pro-1-5', value: 'true' }],
      } as Runtime;

      expect(canUseModel(AIModel.GPT_4 as any, gpt4EnabledRuntime)).to.eql(true);
      expect(canUseModel(AIModel.GPT_4_TURBO as any, gpt4TurboEnabledRuntime)).to.eql(true);
      expect(canUseModel(AIModel.GPT_4O as any, gpt4OEnabledRuntime)).to.eql(true);
      expect(canUseModel(AIModel.GPT_4O_MINI as any, gpt4OMiniEnabledRuntime)).to.eql(true);
      expect(canUseModel(AIModel.GEMINI_PRO_1_5 as any, geminiPro15EnabledRuntime)).to.eql(true);
    });
  });
});
