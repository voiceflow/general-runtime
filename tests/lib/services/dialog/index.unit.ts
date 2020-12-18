/* eslint-disable no-unused-expressions */
import { IntentRequest } from '@voiceflow/general-types';
import { expect } from 'chai';
import sinon from 'sinon';

import DialogManager, { utils as defaultUtils } from '@/lib/services/dialog';
import * as utils from '@/lib/services/dialog/utils';

import {
  mockDMPrefixedMultipleEntityResult,
  mockDMPrefixedNoEntityResult,
  mockDMPrefixedNonSubsetEntityResult,
  mockDMPrefixedUnrelatedSingleEntityResult,
  mockDMPrefixUnrelatedResult,
  mockFulfilledIntentRequest,
  mockLM,
  mockRegularContext,
  mockRegularMultipleEntityResult,
  mockRegularNoEntityResult,
  mockRegularSingleEntityResult,
  mockRegularUnrelatedResult,
  mockUnfulfilledIntentRequest,
} from './fixture';

const createDM = () => {
  const mockVersion = {
    prototype: {
      model: mockLM,
    },
  };
  const services = {
    dataAPI: {
      getVersion: () => mockVersion,
    },
  };
  return new DialogManager({ utils: { ...defaultUtils }, ...services } as any, {} as any);
};

describe('dialog manager unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('helpers', () => {
    it('calls NLU runtime with appropriate prefix', async () => {
      const stub = sinon.stub();
      const services = {
        axios: { post: stub.returns({ data: {} }) },
      };
      const dm = new DialogManager({ utils: { ...defaultUtils }, ...services } as any, {} as any);
      const intentName = 'dummy_intent';
      const queryText = 'some query text';

      await dm.makeDMPrefixedInference(queryText, intentName, 'dummyID');

      const correctResult = `${utils.dmPrefix(intentName)} ${queryText}`;
      expect(stub.args[0][1].query).to.be.equal(correctResult);
    });
  });

  describe('general handler', () => {
    it('fails if version is not found', async () => {
      const services = {
        dataAPI: { getVersion: sinon.stub().resolves() },
      };
      const dm = new DialogManager({ utils: { ...defaultUtils }, ...services } as any, {} as any);
      const result = dm.handle('a' as any);

      await expect(result).to.eventually.be.rejected;
    });
  });

  describe('DM-context handler', () => {
    const dm = createDM();

    describe('CASE-B2_2: no entities extracted from DM-prefixed call', () => {
      it('Migrates DM context to the regular intent', async () => {
        const dmState = {
          intentRequest: mockUnfulfilledIntentRequest,
        };
        const result = await dm.handleDMContext(dmState, mockDMPrefixedNoEntityResult, mockRegularNoEntityResult, mockLM);

        expect(result).to.be.false; // No fallback intent
        expect(dmState.intentRequest).to.deep.equal(mockRegularNoEntityResult);
      });
    });

    describe('CASE-B1: DM-prefixed and regular calls match the same intent', () => {
      it('Upserts the DM state store with the new extracted entities', async () => {
        const dmState = {
          intentRequest: mockRegularSingleEntityResult,
        };
        const result = await dm.handleDMContext(dmState, mockDMPrefixedMultipleEntityResult, mockRegularMultipleEntityResult, mockLM);
        const sizeEntityValue = dmState.intentRequest.payload.entities.find((entity) => entity.name === 'size');
        const toppingEntityValue = dmState.intentRequest.payload.entities.find((entity) => entity.name === 'topping');

        expect(result).to.be.false; // No fallback intent
        expect(sizeEntityValue?.value).to.be.equal('large');
        expect(toppingEntityValue?.value).to.be.equal('pepperoni');
      });
    });

    describe('CASE-B2_4: DM-prefixed call contains entities that are a strict subset of the entities of the target intent', () => {
      it('Upserts the DM state store with the new extracted entities', async () => {
        const dmState = {
          intentRequest: mockRegularNoEntityResult,
        };

        const result = await dm.handleDMContext(dmState, mockDMPrefixedUnrelatedSingleEntityResult, mockRegularUnrelatedResult, mockLM);
        const sizeEntityValue = dmState.intentRequest.payload.entities.find((entity) => entity.name === 'size');

        expect(result).to.be.false; // No fallback intent
        expect(sizeEntityValue?.value).to.be.equal('small');
      });
    });

    describe("CASE-B2_3: DM-prefixed call has entities that are not in the target intent's entity list", () => {
      it('Returns FallBack intent', async () => {
        const dmState = {
          intentRequest: mockRegularNoEntityResult,
        };
        const result = await dm.handleDMContext(dmState, mockDMPrefixedNonSubsetEntityResult, mockRegularNoEntityResult, mockLM);

        expect(result).to.be.true; // trigger fallback intent
      });
    });

    describe("CASE-A1: DM-prefixed and regular calls match the same intent that's different from the target intent", () => {
      it('Migrates DM context to the new regular call intent', async () => {
        const dmState = {
          intentRequest: mockRegularNoEntityResult,
        };

        const result = await dm.handleDMContext(dmState, mockDMPrefixUnrelatedResult, mockRegularUnrelatedResult, mockLM);

        expect(result).to.be.false; // no fallback intent
        expect(dmState.intentRequest.payload.intent.name).to.be.equal('wings_order');
      });
    });

    describe("CASE-A2: DM-prefixed and regular calls don't match the same intent", () => {
      it('Returns FallBack intent', async () => {
        const dmState = {
          intentRequest: mockRegularUnrelatedResult,
        };

        const result = await dm.handleDMContext(dmState, mockRegularNoEntityResult, mockRegularUnrelatedResult, mockLM);

        expect(result).to.be.true; // trigger fallback intent
      });
    });
  });

  describe('Regular-context handler', () => {
    const dm = createDM();

    describe('with unfulfilled entities', async () => {
      it('correctly sets the DM state storage', async () => {
        const result = await dm.handle(mockRegularContext);

        const dmStateStore = result.state.storage.dm;
        expect(dmStateStore).to.not.be.undefined;
        expect(dmStateStore.intentRequest).to.deep.equal(mockUnfulfilledIntentRequest);
      });

      it('returns the required entity prompt defined in the LM', async () => {
        const result = await dm.handle(mockRegularContext);

        const expectedTrace = {
          type: 'speak',
          prompt: 'what flavor?',
        };
        expect(result.end).to.be.true;
        expect(result.trace?.length).to.be.equal(1);
        expect(result.trace![0]).to.be.deep.equal(expectedTrace);
      });
    });

    describe('with fulfilled entities', () => {
      it('removes the DM prefix entities from final entity list', async () => {
        const result = await dm.handle(mockRegularContext);

        const resultEntities = (result.request as IntentRequest).payload.entities;
        const hasDMPrefix = resultEntities.some((entity) => entity.name.startsWith(utils.VF_DM_PREFIX));
        expect(hasDMPrefix).to.be.false;
      });

      it('correctly populates the context request object', async () => {
        const fulfilledContext = { ...mockRegularContext };
        fulfilledContext.request = mockFulfilledIntentRequest;

        const result = await dm.handle(fulfilledContext);

        expect(result.request).to.deep.equal(mockFulfilledIntentRequest);
      });
    });
  });
});
