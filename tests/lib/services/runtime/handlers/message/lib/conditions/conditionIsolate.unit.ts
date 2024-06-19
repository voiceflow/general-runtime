import { expect } from 'chai';

import { ConditionIsolate } from '@/lib/services/runtime/handlers/message/lib/conditions/conditionIsolate';
import { Store } from '@/runtime';

describe('ConditionIsolate', () => {
  let variables: Store;

  beforeEach(() => {
    variables = new Store({
      propA: 1,
      propB: 'hello',
      propC: true,
    });
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
  });
});
