import { expect } from 'chai';

import { evaluateExpression } from '@/runtime/lib/Handlers/utils/shuntingYard';

describe('handler utils shuntingYard unit tests', () => {
  // todo: add more tests
  describe('evaluateExpression', () => {
    it('evaluates correctly', async () => {
      expect(await evaluateExpression('1+2', {})).to.eql(3);
    });
  });
});
