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

    it('throws if cannot match format', () => {
      const key = 'hello world';
      expect(() => utils.extractAPIKeyID(key)).to.throw();
    });
  });
});
