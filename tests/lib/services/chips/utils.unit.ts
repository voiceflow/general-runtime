import { expect } from 'chai';
import sinon from 'sinon';

import * as utils from '@/lib/services/chips/utils';
import { generateVariations, getChoiceChips, sampleUtterance } from '@/lib/services/chips/utils';
import * as dialogUtils from '@/lib/services/dialog/utils';

describe('chips utils unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('sampleUtterance', () => {
    it('not found', async () => {
      expect(sampleUtterance([], {} as any)).to.eql('');
    });

    it('no slots', async () => {
      expect(sampleUtterance([{}] as any, {} as any)).to.eql('');
    });

    it('not every', async () => {
      const utterances = [{ slots: ['slot1', 'slot2'] }];
      const model = { slots: [{ key: 'slot2', inputs: ['barcellona', 'Barcellona'] }] };

      expect(sampleUtterance(utterances as any, model as any)).to.eql('');
    });

    it('works', async () => {
      const replaceSlotsStub = sinon.stub(dialogUtils, 'replaceSlots').returns(' output ');
      const utterances = [{ slots: ['slot1', 'slot3'] }, { slots: ['slot2'], text: 'utterance text' }];
      const model = { slots: [{ key: 'slot2', name: 'slot2', inputs: ['barcellona', 'Barcellona'] }] };

      expect(sampleUtterance(utterances as any, model as any)).to.eql('output');
      expect(replaceSlotsStub.args).to.eql([[utterances[1].text, { slot2: 'barcellona' }]]);
    });
  });

  describe('generateVariations', () => {
    it('no utterances', async () => {
      expect(generateVariations([] as any, null as any)).to.eql([]);
    });

    it('works', async () => {
      const sampleUtteranceStub = sinon
        .stub(utils, 'sampleUtterance')
        .onFirstCall()
        .returns('name1')
        .onSecondCall()
        .returns(null as any)
        .returns('name1');

      const utterances = ['u1', 'u2'];
      const model = { slots: [], intents: [] };

      expect(generateVariations(utterances as any, model as any)).to.eql([{ name: 'name1' }]);
      expect(sampleUtteranceStub.args).to.eql([
        [[utterances[0]], model, 0],
        [[utterances[1]], model, 1],
        [[utterances[0]], model, 2], // utterances[0] again, because % on line 38 prevents from going out of bound
      ]);
    });
  });

  describe('getChoiceChips', () => {
    it('no raw choices', () => {
      expect(getChoiceChips([], null as any)).to.eql([]);
    });

    it('no intent in choices', () => {
      expect(getChoiceChips([{}] as any, null as any)).to.eql([]);
    });

    it('works', () => {
      const sampleUtteranceStub = sinon
        .stub(utils, 'sampleUtterance')
        .onFirstCall()
        .returns('name1')
        .onSecondCall()
        .returns(null as any)
        .returns('name1');

      const rawChoices = [{ intent: 'intent1' }, { intent: 'intent2' }, { intent: 'intent3' }, { intent: 'intent1' }];
      const model = {
        intents: [
          { name: 'intent1', inputs: [{ slots: [{}, {}, {}] }, { slots: [{}, {}] }] },
          { name: 'intent2', inputs: [{}, { slots: [{}] }, {}] },
        ],
        slots: [],
      };

      expect(getChoiceChips(rawChoices as any, model as any)).to.eql([{ name: 'name1', intent: 'intent1' }]);
      expect(sampleUtteranceStub.args).to.eql([
        [[{ slots: [{}, {}] }, { slots: [{}, {}, {}] }], model], // len=2 before len=3 because of sorting on line 63
        [[{}, {}, { slots: [{}] }], model],
        [[{ slots: [{}, {}] }, { slots: [{}, {}, {}] }], model],
      ]);
    });
  });
});
