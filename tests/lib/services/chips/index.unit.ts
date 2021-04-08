import { TraceType } from '@voiceflow/general-types';
import { expect } from 'chai';
import sinon from 'sinon';

import ChipsManager from '@/lib/services/chips';

describe('chips manager unit tests', () => {
  describe('handle', () => {
    it('no trace', async () => {
      const chips = new ChipsManager({} as any, {} as any);

      const context = { data: { api: { getVersion: sinon.stub().resolves(null) } } };
      expect(await chips.handle(context as any)).to.eql({ ...context, trace: [] });
    });

    it('no version', async () => {
      const getChoiceChips = sinon.stub().returns(['getChoiceChipsOutput']);
      const chips = new ChipsManager({ utils: { getChoiceChips } } as any, {} as any);

      const context = {
        data: { api: { getVersion: sinon.stub().resolves(null) } },
        trace: [{ type: 'random' }, { type: TraceType.CHOICE, payload: { choices: ['one', 'two'], foo: 'bar' } }],
      };
      expect(await chips.handle(context as any)).to.eql({
        ...context,
        trace: [{ type: 'random' }, { type: TraceType.CHOICE, payload: { choices: ['getChoiceChipsOutput'] } }],
      });
      expect(getChoiceChips.args).to.eql([[context.trace[1].payload?.choices, { intents: [], slots: [] }]]);
    });

    it('no prototype', async () => {
      const getChoiceChips = sinon.stub().returns(['getChoiceChipsOutput']);
      const chips = new ChipsManager({ utils: { getChoiceChips } } as any, {} as any);

      const context = {
        versionID: 'version-id',
        data: { api: { getVersion: sinon.stub().resolves({}) } },
        trace: [{ type: 'random' }, { type: TraceType.CHOICE, payload: { choices: ['one', 'two'], foo: 'bar' } }],
      };
      expect(await chips.handle(context as any)).to.eql({
        ...context,
        trace: [{ type: 'random' }, { type: TraceType.CHOICE, payload: { choices: ['getChoiceChipsOutput'] } }],
      });
      expect(context.data.api.getVersion.args).to.eql([[context.versionID]]);
      expect(getChoiceChips.args).to.eql([[context.trace[1].payload?.choices, { intents: [], slots: [] }]]);
    });

    it('no model', async () => {
      const getChoiceChips = sinon.stub().returns(['getChoiceChipsOutput']);
      const chips = new ChipsManager({ utils: { getChoiceChips } } as any, {} as any);

      const context = {
        versionID: 'version-id',
        data: { api: { getVersion: sinon.stub().resolves({ prototype: {} }) } },
        trace: [{ type: 'random' }, { type: TraceType.CHOICE, payload: { choices: ['one', 'two'], foo: 'bar' } }],
      };
      expect(await chips.handle(context as any)).to.eql({
        ...context,
        trace: [{ type: 'random' }, { type: TraceType.CHOICE, payload: { choices: ['getChoiceChipsOutput'] } }],
      });
      expect(context.data.api.getVersion.args).to.eql([[context.versionID]]);
      expect(getChoiceChips.args).to.eql([[context.trace[1].payload?.choices, { intents: [], slots: [] }]]);
    });

    it('works', async () => {
      const getChoiceChips = sinon.stub().returns(['getChoiceChipsOutput']);
      const chips = new ChipsManager({ utils: { getChoiceChips } } as any, {} as any);

      const model = { foo: 'bar' };
      const context = {
        versionID: 'version-id',
        data: { api: { getVersion: sinon.stub().resolves({ prototype: { model } }) } },
        trace: [{ type: 'random' }, { type: TraceType.CHOICE, payload: { choices: ['one', 'two'], foo: 'bar' } }],
      };
      expect(await chips.handle(context as any)).to.eql({
        ...context,
        trace: [{ type: 'random' }, { type: TraceType.CHOICE, payload: { choices: ['getChoiceChipsOutput'] } }],
      });
      expect(context.data.api.getVersion.args).to.eql([[context.versionID]]);
      expect(getChoiceChips.args).to.eql([[context.trace[1].payload?.choices, model]]);
    });
  });
});
