import { expect } from 'chai';
import sinon from 'sinon';

import ASRManager, { utils as defaultUtils } from '@/lib/services/asr';

describe('asr manager unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('handle', () => {
    it('passing through', async () => {
      const asr = new ASRManager({ utils: { ...defaultUtils } } as any, {} as any);

      expect(asr.handle('a' as any)).to.eq('a');
    });
  });
});
