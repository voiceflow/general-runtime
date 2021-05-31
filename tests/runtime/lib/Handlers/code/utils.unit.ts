import { expect } from 'chai';
import sinon from 'sinon';

import { vmExecute } from '@/runtime/lib/Handlers/code/utils';

describe('codeHandler utils unit tests', () => {
  describe('vmExecute', () => {
    afterEach(() => {
      sinon.restore();
    });

    it('works correctly', () => {
      const data = {
        code: `
        const _ = requireFromUrl('https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.20/lodash.min.js');
        res = _.add(15, 18);
        res2 = _.max([4, 12, 0, -3, 9]);
        `,
        variables: { res: 0, res2: 0 },
      };
      expect(vmExecute(data, false)).to.eql({ res: 33, res2: 12 });
    });
  });
});
