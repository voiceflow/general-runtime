import { TraceType } from '@voiceflow/general-types';
import { expect } from 'chai';
import sinon from 'sinon';

import ButtonsManager from '@/lib/services/buttons';

describe('buttons manager unit tests', () => {
  describe('handle', () => {
    it('no trace', async () => {
      const buttons = new ButtonsManager({} as any, {} as any);

      const context = { data: { api: { getVersion: sinon.stub().resolves(null) } } };
      expect(await buttons.handle(context as any)).to.eql({ ...context, trace: [] });
    });

    it('no version', async () => {
      const getChoiceButtons = sinon.stub().returns(['getChoiceButtonsOutput']);
      const buttons = new ButtonsManager({ utils: { getChoiceButtons } } as any, {} as any);

      const context = {
        data: { api: { getVersion: sinon.stub().resolves(null) } },
        trace: [{ type: 'random' }, { type: TraceType.CHOICE, payload: { choices: ['one', 'two'], foo: 'bar' } }],
      };
      expect(await buttons.handle(context as any)).to.eql({
        ...context,
        trace: [{ type: 'random' }, { type: TraceType.CHOICE, payload: { choices: ['getChoiceButtonsOutput'] } }],
      });
      expect(getChoiceButtons.args).to.eql([[context.trace[1].payload?.choices, { intents: [], slots: [] }]]);
    });

    it('no prototype', async () => {
      const getChoiceButtons = sinon.stub().returns(['getChoiceButtonsOutput']);
      const buttons = new ButtonsManager({ utils: { getChoiceButtons } } as any, {} as any);

      const context = {
        versionID: 'version-id',
        data: { api: { getVersion: sinon.stub().resolves({}) } },
        trace: [{ type: 'random' }, { type: TraceType.CHOICE, payload: { choices: ['one', 'two'], foo: 'bar' } }],
      };
      expect(await buttons.handle(context as any)).to.eql({
        ...context,
        trace: [{ type: 'random' }, { type: TraceType.CHOICE, payload: { choices: ['getChoiceButtonsOutput'] } }],
      });
      expect(context.data.api.getVersion.args).to.eql([[context.versionID]]);
      expect(getChoiceButtons.args).to.eql([[context.trace[1].payload?.choices, { intents: [], slots: [] }]]);
    });

    it('no model', async () => {
      const getChoiceButtons = sinon.stub().returns(['getChoiceButtonsOutput']);
      const buttons = new ButtonsManager({ utils: { getChoiceButtons } } as any, {} as any);

      const context = {
        versionID: 'version-id',
        data: { api: { getVersion: sinon.stub().resolves({ prototype: {} }) } },
        trace: [{ type: 'random' }, { type: TraceType.CHOICE, payload: { choices: ['one', 'two'], foo: 'bar' } }],
      };
      expect(await buttons.handle(context as any)).to.eql({
        ...context,
        trace: [{ type: 'random' }, { type: TraceType.CHOICE, payload: { choices: ['getChoiceButtonsOutput'] } }],
      });
      expect(context.data.api.getVersion.args).to.eql([[context.versionID]]);
      expect(getChoiceButtons.args).to.eql([[context.trace[1].payload?.choices, { intents: [], slots: [] }]]);
    });

    it('works', async () => {
      const getChoiceButtons = sinon.stub().returns(['getChoiceButtonsOutput']);
      const buttons = new ButtonsManager({ utils: { getChoiceButtons } } as any, {} as any);

      const model = { foo: 'bar' };
      const context = {
        versionID: 'version-id',
        data: { api: { getVersion: sinon.stub().resolves({ prototype: { model } }) } },
        trace: [{ type: 'random' }, { type: TraceType.CHOICE, payload: { choices: ['one', 'two'], foo: 'bar' } }],
      };
      expect(await buttons.handle(context as any)).to.eql({
        ...context,
        trace: [{ type: 'random' }, { type: TraceType.CHOICE, payload: { choices: ['getChoiceButtonsOutput'] } }],
      });
      expect(context.data.api.getVersion.args).to.eql([[context.versionID]]);
      expect(getChoiceButtons.args).to.eql([[context.trace[1].payload?.choices, model]]);
    });
  });
});
