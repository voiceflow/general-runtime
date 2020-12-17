import { expect } from 'chai';
import sinon from 'sinon';

import NLUManager, { utils as defaultUtils } from '@/lib/services/nlu';

describe('nlu manager unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('handle', () => {
    it('passing through', async () => {
      const asr = new NLUManager({ utils: { ...defaultUtils } } as any, {} as any);

      expect(asr.handle('a' as any)).to.eq('a');
    });
  });
});
