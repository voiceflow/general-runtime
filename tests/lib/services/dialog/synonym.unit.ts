import { expect } from 'chai';
import sinon from 'sinon';

import * as synonym from '@/lib/services/dialog/synonym';

import { mockEntityNonSynonymRequest, mockEntitySynonymRequest, mockLM } from './fixture';

describe('intent entity synonyms unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('getSynonym', () => {
    it('ignores single synonyms', () => {
      const inputs = ['quere', 'querys', 'queri'];

      expect(synonym.getSynonym('query', inputs)).to.eql('query');
    });

    it('accounts for misspellings', () => {
      const inputs = ['missisauga, sauga', 'toronto, 6six'];

      expect(synonym.getSynonym('missisaga', inputs)).to.eql('missisauga');
      expect(synonym.getSynonym('tornto', inputs)).to.eql('toronto');
    });

    it('resolves to first instance', () => {
      const inputs = ['missisauga, sauga', 'toronto, 6six'];

      expect(synonym.getSynonym('sauga', inputs)).to.eql('missisauga');
      expect(synonym.getSynonym('6sixx', inputs)).to.eql('toronto');
    });

    it('sanitizes', () => {
      const inputs = ['dessert, Crème Brulée'];

      expect(synonym.getSynonym('CrEmeBruLe', inputs)).to.eql('dessert');
    });

    // it('speed (non-deterministic)', () => {
    //   const randomString = () =>
    //     Math.random()
    //       .toString(36)
    //       .substring(7);
    //   const inputs = Array<string>(1000).fill(`${randomString()},${randomString()}`);

    //   const startTime = Date.now();
    //   expect(synonym.getSynonym('should not match', inputs)).to.eql('should not match');
    //   expect(Date.now() - startTime < 200).to.be.true;
    // });
  });

  describe('rectifyEntityValues', () => {
    it('Converts entity synonyms into the primary entity value', () => {
      const result = synonym.rectifyEntityValue(mockEntitySynonymRequest, mockLM);

      expect(result.payload.entities[0].value).to.be.equal('big');
    });

    it('Preserves entity value if it is not a synonym of any primary entity values', () => {
      const result = synonym.rectifyEntityValue(mockEntityNonSynonymRequest, mockLM);

      expect(result.payload.entities[0].value).to.be.equal('medium');
    });
  });
});
