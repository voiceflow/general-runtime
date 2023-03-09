import { expect } from 'chai';

import * as utils from '@/runtime/lib/DataAPI/utils';

describe('DataAPI utils', () => {
  describe('extractAPIKeyID', () => {
    it('extracts ID from a Dialog Manager API key', () => {
      // eslint-disable-next-line no-secrets/no-secrets
      const key = 'VF.DM.628d5d92faf688001bda7907.dmC8KKO1oX8JO5ai';
      const result = utils.extractAPIKeyID(key);

      expect(result).to.equal('628d5d92faf688001bda7907');
    });

    it('extracts ID from a Workspace API key', () => {
      // eslint-disable-next-line no-secrets/no-secrets
      const key = 'VF.WS.62bcb0cca5184300066f5ac7.egnKyyzZksiS5iGa';
      const result = utils.extractAPIKeyID(key);

      expect(result).to.equal('62bcb0cca5184300066f5ac7');
    });

    it('extracts ID from a Legacy Workspace API key', () => {
      // eslint-disable-next-line no-secrets/no-secrets
      const key = 'VF.62bcb0cca5184300066f5ac7.dmC8KKO1oX8JO5az';
      const result = utils.extractAPIKeyID(key);

      expect(result).to.equal('62bcb0cca5184300066f5ac7');
    });

    it('returns null if cannot match format', () => {
      const key = 'hello world';
      expect(utils.extractAPIKeyID(key)).to.eq(null);
    });
  });
});
