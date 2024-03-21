import { expect } from 'chai';
import sinon from 'sinon';

import { ivmExecute } from '@/runtime/lib/Handlers/code/utils';

describe('codeHandler utils unit tests', () => {
  describe('ivmExecute', () => {
    afterEach(() => {
      sinon.restore();
    });

    it('works correctly', async () => {
      const data = {
        code: `
        res = 15 + 18;
        res2 = true ? 12 : 11;
        `,
        variables: { res: 0, res2: 0 },
      };
      expect(await ivmExecute(data)).to.eql({ res: 33, res2: 12 });
    });
  });
});
