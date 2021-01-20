/* eslint-disable no-unused-expressions */
import { expect } from 'chai';
import sinon from 'sinon';

import * as utils from '@/lib/services/dialog/utils';

import { mockEntityNonSynonymRequest, mockEntitySynonymRequest, mockFulfilledIntentRequest, mockLM, mockUnfulfilledIntentRequest } from './fixture';

describe('dialog manager utilities unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('getDMPrefixIntentName', () => {
    it('assembles the correct DM-context intent name', async () => {
      const intentName = 'dummy';
      const hash = utils.dmPrefix(intentName);
      const result = utils.getDMPrefixIntentName(intentName);

      expect(result).to.equal(`${utils.VF_DM_PREFIX}${hash}_${intentName}`);
    });
  });

  describe('getSlotNameByID', () => {
    it('finds the correct slot name given ID', () => {
      const result = utils.getSlotNameByID('tjl3zwj', mockLM);

      expect(result).to.equal('size');
    });
  });

  describe('fillStringEntities', () => {
    it('fills a given string with slot notation with actual slot values', () => {
      const result = utils.fillStringEntities('I want {{[size].tjl3zwj}} {{[size].tjl3zwj}} chicken wings', mockUnfulfilledIntentRequest);

      expect(result).to.equal('I want large large chicken wings');
    });

    it("doesn't modify a string without entity placeholders", () => {
      const input = 'I want some chicken wings';
      const result = utils.fillStringEntities(input, mockUnfulfilledIntentRequest);

      expect(result).to.equal(input);
    });

    it('Fills unpopulated entity placeholders with an empty string', () => {
      const input = 'I want some {{[foo].bar}} chicken wings';
      const result = utils.fillStringEntities(input, mockUnfulfilledIntentRequest);

      expect(result).to.equal('I want some  chicken wings');
    });
  });

  describe('getUnfulfilledEntity', () => {
    it('gets one unfulfilled required entity model', () => {
      const result = utils.getUnfulfilledEntity(mockUnfulfilledIntentRequest, mockLM);

      expect(result).to.not.be.undefined;
      expect(result?.id).to.be.equal('4w253zil');
    });

    it('returns undefined if all required entities are fulfilled', () => {
      const result = utils.getUnfulfilledEntity(mockFulfilledIntentRequest, mockLM);

      expect(result).to.be.undefined;
    });
  });
});
