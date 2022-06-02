import { BaseRequest } from '@voiceflow/base-types';
import * as NLC from '@voiceflow/natural-language-commander';
import * as standardSlots from '@voiceflow/natural-language-commander/dist/lib/standardSlots';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import { expect } from 'chai';
import sinon from 'sinon';

import * as nlc from '@/lib/services/nlu/nlc';
import {
  createNLC,
  handleNLCCommand,
  handleNLCDialog,
  nlcToIntent,
  registerBuiltInIntents,
  registerSlots,
} from '@/lib/services/nlu/nlc';
import * as utils from '@/lib/services/nlu/utils';

import { customTypeSlots, regexMatcherSlots } from './fixture';

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
        type: BaseRequest.RequestType.INTENT,
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
        registerIntent: sinon.stub().onFirstCall().throws('first call error'),
      };

      registerBuiltInIntents(nlcObj as any, locale as any);
      const registerIntentArgs = VoiceflowConstants.DEFAULT_INTENTS_MAP.en.map(({ name, samples }) => [
        { intent: name, utterances: samples },
      ]);
      expect(nlcObj.registerIntent.args).to.eql(registerIntentArgs);
    });

    it('no language', () => {
      const nlcObj = {
        registerIntent: sinon.stub().onFirstCall().throws('first call error'),
      };

      registerBuiltInIntents(nlcObj as any);
      // eslint-disable-next-line sonarjs/no-identical-functions
      const registerIntentArgs = VoiceflowConstants.DEFAULT_INTENTS_MAP.en.map(({ name, samples }) => [
        { intent: name, utterances: samples },
      ]);
      expect(nlcObj.registerIntent.args).to.eql(registerIntentArgs);
    });

    it('language supported', () => {
      const locale = 'español';
      const nlcObj = {
        registerIntent: sinon.stub().onFirstCall().throws('first call error'),
      };

      registerBuiltInIntents(nlcObj as any, locale as any);
      // eslint-disable-next-line sonarjs/no-identical-functions
      const registerIntentArgs = VoiceflowConstants.DEFAULT_INTENTS_MAP.es.map(({ name, samples }) => [
        { intent: name, utterances: samples },
      ]);
      expect(nlcObj.registerIntent.args).to.eql(registerIntentArgs);
    });
  });

  describe('registerSlots', () => {
    afterEach(() => {
      sinon.restore();
    });

    it('calls addSlotType with slots of non-custom type, empty inputs, no type value, no inputs when openslot is true', () => {
      const nlcObj = {
        addSlotType: sinon.stub(),
      };
      const matcherRegex = /[\S\s]*/;
      const slots = regexMatcherSlots;

      registerSlots(nlcObj as any, { slots } as any, true);

      expect(nlcObj.addSlotType.args).to.eql([
        [{ type: slots[0].name, matcher: matcherRegex }],
        [{ type: slots[1].name, matcher: matcherRegex }],
        [{ type: slots[2].name, matcher: matcherRegex }],
        [{ type: slots[3].name, matcher: matcherRegex }],
        [{ type: slots[4].name, matcher: matcherRegex }],
      ]);
    });

    it('no calls to addSlotType with slots of non-custom type, empty inputs, no type value, no inputs when openslot is false', () => {
      const nlcObj = {
        addSlotType: sinon.stub(),
      };
      const slots = regexMatcherSlots;

      registerSlots(nlcObj as any, { slots } as any, false);

      expect(nlcObj.addSlotType.callCount).to.eql(0);
    });

    it('calls addSlotType with right matchers with slots of type custom when openslot is true', () => {
      const nlcObj = {
        addSlotType: sinon.stub(),
      };
      const slots = customTypeSlots;

      registerSlots(nlcObj as any, { slots } as any, true);

      expect(nlcObj.addSlotType.args).to.eql([
        [{ type: slots[0].name, matcher: ['custom-input1'] }],
        [{ type: slots[1].name, matcher: ['abc', 'def', 'geh', 'x', 'y', 'z'] }],
        [{ type: slots[2].name, matcher: ['a', 'b'] }],
      ]);
    });

    it('calls addSlotType with right matchers with slots of type custom when openslot is false', () => {
      const nlcObj = {
        addSlotType: sinon.stub(),
      };
      const slots = customTypeSlots;

      registerSlots(nlcObj as any, { slots } as any, false);

      expect(nlcObj.addSlotType.args).to.eql([
        [{ type: slots[0].name, matcher: ['custom-input1'] }],
        [{ type: slots[1].name, matcher: ['abc', 'def', 'geh', 'x', 'y', 'z'] }],
        [{ type: slots[2].name, matcher: ['a', 'b'] }],
      ]);
    });

    it('doesnt call addSlotType for empty slot', () => {
      const nlcObj = {
        addSlotType: sinon.stub(),
      };

      registerSlots(nlcObj as any, { slots: [] } as any, true);

      expect(nlcObj.addSlotType.callCount).to.eql(0);
    });

    it('mix of slots that result in custom and regex matchers with openslots true', () => {
      const nlcObj = {
        addSlotType: sinon.stub(),
      };
      const slots = [...customTypeSlots, ...regexMatcherSlots];
      const matcherRegex = /[\S\s]*/;

      registerSlots(nlcObj as any, { slots } as any, true);

      expect(nlcObj.addSlotType.args).to.eql([
        [{ type: slots[0].name, matcher: ['custom-input1'] }],
        [{ type: slots[1].name, matcher: ['abc', 'def', 'geh', 'x', 'y', 'z'] }],
        [{ type: slots[2].name, matcher: ['a', 'b'] }],
        [{ type: slots[3].name, matcher: matcherRegex }],
        [{ type: slots[4].name, matcher: matcherRegex }],
        [{ type: slots[5].name, matcher: matcherRegex }],
        [{ type: slots[6].name, matcher: matcherRegex }],
        [{ type: slots[7].name, matcher: matcherRegex }],
      ]);
    });
  });
});
