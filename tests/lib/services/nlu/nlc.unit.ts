import { BaseRequest } from '@voiceflow/base-types';
import * as NLC from '@voiceflow/natural-language-commander';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import { expect } from 'chai';
import sinon from 'sinon';

import * as nlc from '@/lib/services/nlu/nlc';
import {
  createNLC,
  handleNLCCommand,
  nlcToIntent,
  registerBuiltInIntents,
  registerIntents,
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
      const dmRequest = 'dmRequest';

      expect(createNLC({ model, locale, openSlot, dmRequest } as any)).to.eql(nlcObj);
      expect(NLCStub.callCount).to.eql(1);
      expect(registerSlotsStub.args).to.eql([[nlcObj, model, openSlot]]);
      expect(registerIntentsStub.args).to.eql([[nlcObj, model, dmRequest]]);
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
      const dmRequest = 'dmRequest';

      expect(handleNLCCommand({ query, model, locale, dmRequest } as any)).to.eql(output);
      expect(createNLCStub.args).to.eql([[{ model, locale, openSlot: true, dmRequest }]]);
      expect(nlcObj.handleCommand.args).to.eql([[query]]);
      expect(nlcToIntentStub.args).to.eql([[commandRes, query, 0.5]]);
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
      const dmRequest = 'dmRequest';

      expect(handleNLCCommand({ query, model, locale, openSlot: false, dmRequest } as any)).to.eql(output);
      expect(createNLCStub.args).to.eql([[{ model, locale, openSlot: false, dmRequest }]]);
      expect(nlcObj.handleCommand.args).to.eql([[query]]);
      expect(nlcToIntentStub.args).to.eql([[commandRes, query, 1]]);
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

  describe('registerIntents', () => {
    afterEach(() => {
      sinon.restore();
    });

    it('works', () => {
      const nlcObj = {
        registerIntent: sinon.stub(),
      };

      const slots = [
        {
          key: 'slot1',
          name: 'slot1name',
        },
      ];
      const intents = [
        { name: 'intent1', inputs: [{ text: 'input1' }], slots: [] },
        {
          name: 'intent2',
          inputs: [{ text: 'input2 {{[slot1name].slot1}}' }],
          slots: [{ id: 'slot1', required: true }],
        },
      ];

      registerIntents(nlcObj as any, { intents, slots } as any);

      expect(nlcObj.registerIntent.args).to.eql([
        [{ intent: intents[0].name, utterances: ['input1'], slots: intents[0].slots }],
        [
          {
            intent: intents[1].name,
            utterances: ['input2 {slot1name}'],
            slots: [{ name: 'slot1name', required: true, type: 'slot1name' }],
          },
        ],
      ]);
    });

    it('works with dmRequest', () => {
      const nlcObj = {
        registerIntent: sinon.stub(),
      };

      const slots = [
        {
          key: 'slot1',
          name: 'slot1name',
        },
        {
          key: 'slot2',
          name: 'slot2name',
        },
      ];
      const intents = [
        {
          name: 'intent1',
          inputs: [{ text: 'input1' }],
          slots: [
            {
              id: 'slot1',
              required: true,
              dialog: {
                utterances: [
                  { text: 'intent1 {{[slot1name].slot1}} utterance1' },
                  { text: 'intent1 {{[slot1name].slot1}} utterance2' },
                ],
              },
            },
            {
              id: 'slot2',
              required: true,
              dialog: {
                utterances: [
                  { text: 'intent1 {{[slot2name].slot2}} utterance1' },
                  { text: 'intent1 {{[slot2name].slot2}} utterance2' },
                ],
              },
            },
          ],
        },
      ];

      const dmRequest = {
        intent: { name: 'intent1' },
        query: '',
        entities: [{ name: 'slot1name', value: 'slot1value' }],
      };

      registerIntents(nlcObj as any, { intents, slots } as any, dmRequest);

      expect(nlcObj.registerIntent.args).to.eql([
        [
          {
            intent: intents[0].name,
            utterances: [
              '38c7c7a016 intent1 {slot2name} utterance1',
              '38c7c7a016 intent1 {slot2name} utterance2',
              '38c7c7a016 {slot2name}',
              'input1', // this should be in the middle since slot1name is already filled in dmRequest
              '38c7c7a016 intent1 {slot1name} utterance1',
              '38c7c7a016 intent1 {slot1name} utterance2',
              '38c7c7a016 {slot1name}',
            ],
            slots: [
              { name: 'slot1name', required: true, type: 'slot1name' },
              { name: 'slot2name', required: true, type: 'slot2name' },
            ],
          },
        ],
      ]);
    });
  });
});
