import { expect } from 'chai';
import sinon from 'sinon';

import { ivmExecute, objectDiff, vmExecute } from '@/runtime/lib/Handlers/code/utils';

describe('codeHandler utils unit tests', () => {
  describe('vmExecute', () => {
    afterEach(() => {
      sinon.restore();
    });

    it('works correctly', () => {
      const data = {
        code: `
        res = 15 + 18;
        res2 = true ? 12 : 11;
        `,
        variables: { res: 0, res2: 0 },
      };
      expect(vmExecute(data, true)).to.eql({ res: 33, res2: 12 });
    });
  });
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

  describe('objectDiff', () => {
    it('returns the difference between two objects', () => {
      const obj1 = { a: 1, b: 2, c: 3 };
      const obj2 = { a: 1, b: 2, c: 4 };
      expect(objectDiff(obj1, obj2)).to.eql({ c: 4 });
    });
  });
});
