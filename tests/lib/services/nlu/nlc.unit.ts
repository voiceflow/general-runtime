import { Request } from '@voiceflow/base-types';
import { Constants } from '@voiceflow/general-types';
import * as NLC from '@voiceflow/natural-language-commander';
import * as standardSlots from '@voiceflow/natural-language-commander/dist/lib/standardSlots';
import { expect } from 'chai';
import sinon from 'sinon';

import * as nlc from '@/lib/services/nlu/nlc';
import { createNLC, handleNLCCommand, handleNLCDialog, nlcToIntent, registerBuiltInIntents } from '@/lib/services/nlu/nlc';
import * as utils from '@/lib/services/nlu/utils';

describe('nlu nlc service unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('createNLC', () => {
    it('works', async () => {
      const nlcObj = { foo: 'bar' };
      const NLCStub = sinon.stub(NLC, 'default').returns(nlcObj);
      const registerSlotsStub = sinon.stub(nlc, 'registerSlots');
      const registerIntentsStub = sinon.stub(nlc, 'registerIntents');
      const registerBuiltInIntentsStub = sinon.stub(nlc, 'registerBuiltInIntents');

      const model = 'model';
      const locale = 'locale';
      const openSlot = 'openSlot';

      expect(createNLC({ model, locale, openSlot } as any)).to.eql(nlcObj);
      expect(NLCStub.callCount).to.eql(1);
      expect(registerSlotsStub.args).to.eql([[nlcObj, model, openSlot]]);
      expect(registerIntentsStub.args).to.eql([[nlcObj, model]]);
      expect(registerBuiltInIntentsStub.args).to.eql([[nlcObj, locale]]);
    });
  });

  describe('handleNLCCommand', () => {
    it('works', () => {
      const commandRes = { foo: 'bar' };
      const nlcObj = { handleCommand: sinon.stub().returns(commandRes) };
      const createNLCStub = sinon.stub(nlc, 'createNLC').returns(nlcObj as any);

      const output = 'output';
      const nlcToIntentStub = sinon.stub(nlc, 'nlcToIntent').returns(output as any);

      const query = 'query';
      const model = 'model';
      const locale = 'locale';

      expect(handleNLCCommand({ query, model, locale } as any)).to.eql(output);
      expect(createNLCStub.args).to.eql([[{ model, locale, openSlot: true }]]);
      expect(nlcObj.handleCommand.args).to.eql([[query]]);
      expect(nlcToIntentStub.args).to.eql([[commandRes, query, undefined]]);
    });

    it('openSlot false', () => {
      const commandRes = { foo: 'bar' };
      const nlcObj = { handleCommand: sinon.stub().returns(commandRes) };
      const createNLCStub = sinon.stub(nlc, 'createNLC').returns(nlcObj as any);

      const output = 'output';
      const nlcToIntentStub = sinon.stub(nlc, 'nlcToIntent').returns(output as any);

      const query = 'query';
      const model = 'model';
      const locale = 'locale';

      expect(handleNLCCommand({ query, model, locale, openSlot: false } as any)).to.eql(output);
      expect(createNLCStub.args).to.eql([[{ model, locale, openSlot: false }]]);
      expect(nlcObj.handleCommand.args).to.eql([[query]]);
      expect(nlcToIntentStub.args).to.eql([[commandRes, query, 1]]);
    });
  });

  describe('handleNLCDialog', () => {
    it('works', () => {
      const dialogRes = { foo: 'bar' };
      const intent = { slots: ['s1', 's2'] };
      const nlcObj = { handleDialog: sinon.stub().returns(dialogRes), getIntent: sinon.stub().returns(intent) };
      const createNLCStub = sinon.stub(nlc, 'createNLC').returns(nlcObj as any);

      const required = true;
      const getRequiredStub = sinon.stub(standardSlots, 'getRequired').returns(required as any);

      const output = 'output';
      const nlcToIntentStub = sinon.stub(nlc, 'nlcToIntent').returns(output as any);

      const query = 'query';
      const model = 'model';
      const locale = 'locale';
      const dmRequest = { payload: { intent: { name: 'intent_name' }, entities: ['e1', 'e2'] } };

      expect(handleNLCDialog({ query, model, locale, dmRequest } as any)).to.eql(output);
      expect(createNLCStub.args).to.eql([[{ model, locale, openSlot: true }]]);
      expect(nlcObj.getIntent.args).to.eql([[dmRequest.payload.intent.name]]);
      expect(getRequiredStub.args).to.eql([[intent.slots, dmRequest.payload.entities]]);
      expect(nlcObj.handleDialog.args).to.eql([
        [
          {
            intent: dmRequest.payload.intent.name,
            required,
            slots: dmRequest.payload.entities,
          },
          query,
        ],
      ]);
      expect(nlcToIntentStub.args).to.eql([[dialogRes, query]]);
    });

    it('no intent', () => {
      const dialogRes = { foo: 'bar' };
      const nlcObj = { handleDialog: sinon.stub().returns(dialogRes), getIntent: sinon.stub().returns(null) };
      const createNLCStub = sinon.stub(nlc, 'createNLC').returns(nlcObj as any);

      const required = true;
      const getRequiredStub = sinon.stub(standardSlots, 'getRequired').returns(required as any);

      const output = 'output';
      const nlcToIntentStub = sinon.stub(nlc, 'nlcToIntent').returns(output as any);

      const query = 'query';
      const model = 'model';
      const locale = 'locale';
      const dmRequest = { payload: { intent: { name: 'intent_name' }, entities: ['e1', 'e2'] } };

      expect(handleNLCDialog({ query, model, locale, dmRequest } as any)).to.eql(output);
      expect(createNLCStub.args).to.eql([[{ model, locale, openSlot: true }]]);
      expect(nlcObj.getIntent.args).to.eql([[dmRequest.payload.intent.name]]);
      expect(getRequiredStub.args).to.eql([[[], dmRequest.payload.entities]]);
      expect(nlcObj.handleDialog.args).to.eql([
        [
          {
            intent: dmRequest.payload.intent.name,
            required,
            slots: dmRequest.payload.entities,
          },
          query,
        ],
      ]);
      expect(nlcToIntentStub.args).to.eql([[dialogRes, query]]);
    });
  });

  describe('nlcToIntent', () => {
    it('no intent', () => {
      const output = 'output';
      const getNoneIntentRequestStub = sinon.stub(utils, 'getNoneIntentRequest').returns(output as any);

      expect(nlcToIntent(null)).to.eql(output);
      expect(getNoneIntentRequestStub.args).to.eql([['']]);
    });

    it('with intent', () => {
      const intent = {
        intent: 'name',
        slots: [{ name: 's1' }, { name: 's2', value: 'v2' }],
      };
      const query = 'query';
      const confidence = 0.8;

      expect(nlcToIntent(intent, query, confidence)).to.eql({
        type: Request.RequestType.INTENT,
        payload: {
          query,
          intent: { name: intent.intent },
          entities: [{ name: 's2', value: 'v2' }],
          confidence,
        },
      });
    });
  });

  describe('registerBuiltInIntents', () => {
    it('language not supported', () => {
      const locale = '00xx';
      const nlcObj = {
        registerIntent: sinon
          .stub()
          .onFirstCall()
          .throws('first call error'),
      };

      registerBuiltInIntents(nlcObj as any, locale as any);
      const registerIntentArgs = Constants.DEFAULT_INTENTS_MAP.en.map(({ name, samples }) => [{ intent: name, utterances: samples }]);
      expect(nlcObj.registerIntent.args).to.eql(registerIntentArgs);
    });

    it('no language', () => {
      const nlcObj = {
        registerIntent: sinon
          .stub()
          .onFirstCall()
          .throws('first call error'),
      };

      registerBuiltInIntents(nlcObj as any);
      const registerIntentArgs = Constants.DEFAULT_INTENTS_MAP.en.map(({ name, samples }) => [{ intent: name, utterances: samples }]);
      expect(nlcObj.registerIntent.args).to.eql(registerIntentArgs);
    });

    it('language supported', () => {
      const locale = 'español';
      const nlcObj = {
        registerIntent: sinon
          .stub()
          .onFirstCall()
          .throws('first call error'),
      };

      registerBuiltInIntents(nlcObj as any, locale as any);
      const registerIntentArgs = Constants.DEFAULT_INTENTS_MAP.es.map(({ name, samples }) => [{ intent: name, utterances: samples }]);
      expect(nlcObj.registerIntent.args).to.eql(registerIntentArgs);
    });
  });
});
