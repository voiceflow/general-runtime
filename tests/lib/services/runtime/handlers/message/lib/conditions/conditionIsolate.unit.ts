import { expect } from 'chai';

import { ConditionIsolate } from '@/lib/services/runtime/handlers/message/lib/conditions/conditionIsolate';

describe('ConditionIsolate', () => {
  let variables: Record<string, unknown>;

  beforeEach(() => {
    variables = {
      propA: 1,
      propB: 'hello',
      propC: true,
    };
  });

  describe('executeCode', () => {
    it('fails if code is executed before isolate is initialized', async () => {
      const isolate = new ConditionIsolate(variables);

      const code = () => isolate.executeCode('propA + propB + propC');

      expect(code()).to.rejectedWith(`condition isolate was not initialized before an attempt to execute code`);
    });

    it('executes code and returns last evaluated expression', async () => {
      const isolate = new ConditionIsolate(variables);
      await isolate.initialize();

      const result = await isolate.executeCode('propA + propB + propC');
      await isolate.cleanup();

      expect(result).to.eql('1hellotrue');
    });

    it('executes exported default function and returns last evaluated expression', async () => {
      const isolate = new ConditionIsolate(variables);
      await isolate.initialize();

      const result = await isolate.executeFunction('return propA + propB + propC');
      await isolate.cleanup();

      expect(result).to.eql('1hellotrue');
    });
  });
});
