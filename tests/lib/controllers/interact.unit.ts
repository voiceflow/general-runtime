import { expect } from 'chai';
import sinon from 'sinon';

import Interact from '@/lib/controllers/interact';

const output = (context: any, state: string, params?: any) => ({ ...context, ...params, state, end: false });

const buildServices = (context: any) => ({
  state: { handle: sinon.stub().resolves(output(context, 'state')) },
  asr: { handle: sinon.stub().resolves(output(context, 'asr')) },
  nlu: { handle: sinon.stub().resolves(output(context, 'nlu')) },
  slots: { handle: sinon.stub().resolves(output(context, 'slots')) },
  tts: { handle: sinon.stub().resolves(output(context, 'tts')) },
  audio: { handle: sinon.stub().resolves(output(context, 'audio')) },
  runtime: { handle: sinon.stub().resolves(output(context, 'runtime')) },
  dialog: { handle: sinon.stub().resolves(output(context, 'dialog')) },
  chips: { handle: sinon.stub().resolves(output(context, 'chips')) },
  filter: { handle: sinon.stub().resolves(output(context, 'filter', { trace: 'trace' })) },
  metrics: { generalRequest: sinon.stub() },
});

describe('interact controller unit tests', () => {
  describe('handler', () => {
    it('works correctly', async () => {
      const req = {
        headers: { authorization: 'auth', origin: 'origin' },
        body: { state: { foo: 'bar' }, request: 'request', config: { tts: true } },
        params: { versionID: 'versionID' },
        query: { locale: 'locale' },
      };
      const context = {
        state: req.body.state,
        request: req.body.request,
        versionID: req.params.versionID,
        data: {
          locale: req.query.locale,
          config: {
            tts: true,
          },
          reqHeaders: {
            authorization: req.headers.authorization,
            origin: req.headers.origin,
          },
        },
      };

      const services = buildServices(context);

      const interactController = new Interact(services as any, null as any);

      expect(await interactController.handler(req as any)).to.eql({
        state: 'filter',
        request: context.request,
        trace: 'trace',
      });

      expect(services.state.handle.args).to.eql([[context]]);
      expect(services.asr.handle.args).to.eql([[output(context, 'state')]]);
      expect(services.nlu.handle.args).to.eql([[output(context, 'asr')]]);
      expect(services.slots.handle.args).to.eql([[output(context, 'nlu')]]);
      expect(services.dialog.handle.args).to.eql([[output(context, 'slots')]]);
      expect(services.runtime.handle.args).to.eql([[output(context, 'dialog')]]);
      expect(services.tts.handle.args).to.eql([[output(context, 'runtime')]]);
      expect(services.audio.handle.args).to.eql([[output(context, 'tts')]]);
      expect(services.chips.handle.args).to.eql([[output(context, 'audio')]]);
      expect(services.metrics.generalRequest.callCount).to.eql(1);
    });

    it('omits TTS if specified in config', async () => {
      const req = {
        body: { state: { foo: 'bar' }, request: 'request', config: { tts: false } },
        headers: {},
        params: { versionID: 'versionID' },
        query: { locale: 'locale' },
      };
      const context = { state: req.body.state, request: req.body.request, versionID: req.params.versionID, data: { locale: req.query.locale } };

      const services = buildServices(context);

      const interactController = new Interact(services as any, null as any);

      expect(await interactController.handler(req as any)).to.eql({
        state: 'filter',
        request: context.request,
        trace: 'trace',
      });

      expect(services.tts.handle.callCount).to.eql(0);
      expect(services.audio.handle.args).to.eql([[output(context, 'runtime')]]);
    });
  });

  it('includes TTS if config is unspecified', async () => {
    const req = {
      body: { state: { foo: 'bar' }, request: 'request' },
      headers: {},
      params: { versionID: 'versionID' },
      query: { locale: 'locale' },
    };
    const context = { state: req.body.state, request: req.body.request, versionID: req.params.versionID, data: { locale: req.query.locale } };

    const services = buildServices(context);

    const interactController = new Interact(services as any, null as any);
    expect(await interactController.handler(req as any)).to.eql({
      state: 'filter',
      request: context.request,
      trace: 'trace',
    });
    expect(services.tts.handle.callCount).to.eql(1);
  });

  it('includes TTS if tts is unspecified', async () => {
    const req = {
      body: { state: { foo: 'bar' }, request: 'request', config: {} },
      headers: {},
      params: { versionID: 'versionID' },
      query: { locale: 'locale' },
    };
    const context = { state: req.body.state, request: req.body.request, versionID: req.params.versionID, data: { locale: req.query.locale } };

    const services = buildServices(context);

    const interactController = new Interact(services as any, null as any);
    expect(await interactController.handler(req as any)).to.eql({
      state: 'filter',
      request: context.request,
      trace: 'trace',
    });
    expect(services.tts.handle.callCount).to.eql(1);
  });
});
