import { RequestType } from '@voiceflow/general-types';
import { expect } from 'chai';
import sinon from 'sinon';

import Interact from '@/lib/services/interact';

const output = (context: any, state: string, params?: any) => ({ ...context, ...params, state, end: false });

const buildServices = (context: any) => ({
  state: { handle: sinon.stub().resolves(output(context, 'state')) },
  asr: { handle: sinon.stub().resolves(output(context, 'asr')) },
  nlu: { handle: sinon.stub().resolves(output(context, 'nlu')) },
  slots: { handle: sinon.stub().resolves(output(context, 'slots')) },
  tts: { handle: sinon.stub().resolves(output(context, 'tts')) },
  speak: { handle: sinon.stub().resolves(output(context, 'speak')) },
  runtime: { handle: sinon.stub().resolves(output(context, 'runtime')) },
  dialog: { handle: sinon.stub().resolves(output(context, 'dialog')) },
  chips: { handle: sinon.stub().resolves(output(context, 'chips')) },
  filter: { handle: sinon.stub().resolves(output(context, 'filter', { trace: 'trace' })) },
  metrics: { generalRequest: sinon.stub() },
});

describe('interact service unit tests', () => {
  describe('handler', () => {
    it('works correctly', async () => {
      const data = {
        headers: { authorization: 'auth', origin: 'origin' },
        body: { state: { foo: 'bar' }, request: 'request', config: { tts: true } },
        params: { versionID: 'versionID' },
        query: { locale: 'locale' },
      };
      const context = {
        state: data.body.state,
        request: data.body.request,
        versionID: data.params.versionID,
        data: {
          locale: data.query.locale,
          config: {
            tts: true,
          },
          reqHeaders: {
            authorization: data.headers.authorization,
            origin: data.headers.origin,
          },
        },
      };

      const services = buildServices(context);

      const interactManager = new Interact(services as any, null as any);

      expect(await interactManager.handler(data as any)).to.eql({
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
      expect(services.speak.handle.args).to.eql([[output(context, 'tts')]]);
      expect(services.chips.handle.args).to.eql([[output(context, 'speak')]]);
      expect(services.metrics.generalRequest.callCount).to.eql(1);
    });

    it('launch request', async () => {
      const data = {
        headers: { authorization: 'auth', origin: 'origin' },
        body: { state: { foo: 'bar', stack: [{}, {}], storage: { foo: 'bar' } }, request: { type: RequestType.LAUNCH }, config: { tts: true } },
        params: { versionID: 'versionID' },
        query: { locale: 'locale' },
      };
      const context = {
        state: { ...data.body.state, stack: [], storage: {} },
        request: null,
        versionID: data.params.versionID,
        data: {
          locale: data.query.locale,
          config: {
            tts: true,
          },
          reqHeaders: {
            authorization: data.headers.authorization,
            origin: data.headers.origin,
          },
        },
      };

      const services = buildServices(context);

      const interactManager = new Interact(services as any, null as any);

      expect(await interactManager.handler(data as any)).to.eql({
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
      expect(services.speak.handle.args).to.eql([[output(context, 'tts')]]);
      expect(services.chips.handle.args).to.eql([[output(context, 'speak')]]);
      expect(services.metrics.generalRequest.callCount).to.eql(1);
    });

    it('omits TTS if specified in config', async () => {
      const data = {
        body: { state: { foo: 'bar' }, request: 'request', config: { tts: false } },
        headers: {},
        params: { versionID: 'versionID' },
        query: { locale: 'locale' },
      };
      const context = { state: data.body.state, request: data.body.request, versionID: data.params.versionID, data: { locale: data.query.locale } };

      const services = buildServices(context);

      const interactController = new Interact(services as any, null as any);

      expect(await interactController.handler(data as any)).to.eql({
        state: 'filter',
        request: context.request,
        trace: 'trace',
      });

      expect(services.tts.handle.callCount).to.eql(0);
      expect(services.speak.handle.args).to.eql([[output(context, 'runtime')]]);
    });
  });

  it('includes TTS if config is unspecified', async () => {
    const data = {
      body: { state: { foo: 'bar' }, request: 'request' },
      headers: {},
      params: { versionID: 'versionID' },
      query: { locale: 'locale' },
    };
    const context = { state: data.body.state, request: data.body.request, versionID: data.params.versionID, data: { locale: data.query.locale } };

    const services = buildServices(context);

    const interactController = new Interact(services as any, null as any);
    expect(await interactController.handler(data as any)).to.eql({
      state: 'filter',
      request: context.request,
      trace: 'trace',
    });
    expect(services.tts.handle.callCount).to.eql(1);
  });

  it('includes TTS if tts is unspecified', async () => {
    const data = {
      body: { state: { foo: 'bar' }, request: 'request', config: {} },
      headers: {},
      params: { versionID: 'versionID' },
      query: { locale: 'locale' },
    };
    const context = { state: data.body.state, request: data.body.request, versionID: data.params.versionID, data: { locale: data.query.locale } };

    const services = buildServices(context);

    const interactController = new Interact(services as any, null as any);
    expect(await interactController.handler(data as any)).to.eql({
      state: 'filter',
      request: context.request,
      trace: 'trace',
    });
    expect(services.tts.handle.callCount).to.eql(1);
  });
});
