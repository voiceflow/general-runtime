import { expect } from 'chai';
import sinon from 'sinon';

import Interact from '@/lib/services/interact';
import { TurnBuilder } from '@/runtime';

const output = (context: any, state: string, params?: any) => ({ ...context, ...params, state, end: false });

const buildServices = (context: any) => ({
  state: { handle: sinon.stub().resolves(output(context, 'state')) },
  asr: { handle: sinon.stub().resolves(output(context, 'asr')) },
  nlu: { handle: sinon.stub().resolves(output(context, 'nlu')) },
  slots: { handle: sinon.stub().resolves(output(context, 'slots')) },
  tts: { handle: sinon.stub().resolves(output(context, 'tts')) },
  speak: { handle: sinon.stub().resolves(output(context, 'speak')) },
  runtime: { handle: sinon.stub().resolves(output(context, 'runtime')) },
  analytics: { handle: sinon.stub().resolves(output(context, 'analytics')) },
  dialog: { handle: sinon.stub().resolves(output(context, 'dialog')) },
  filter: { handle: sinon.stub().resolves(output(context, 'filter', { trace: 'trace' })) },
  metrics: { generalRequest: sinon.stub() },
  utils: { TurnBuilder },
});

describe('interact service unit tests', () => {
  describe('handler', () => {
    it('works correctly', async () => {
      const data = {
        headers: { authorization: 'auth', origin: 'origin', versionID: 'versionID' },
        body: { state: { foo: 'bar' }, request: 'request', config: { tts: true, selfDelegate: true } },
        params: {},
        query: { locale: 'locale' },
      };
      const context = {
        state: data.body.state,
        request: data.body.request,
        versionID: data.headers.versionID,
        userID: undefined,
        data: {
          locale: data.query.locale,
          config: {
            tts: true,
            selfDelegate: true,
          },
          reqHeaders: {
            authorization: data.headers.authorization,
            origin: data.headers.origin,
            sessionid: undefined,
            platform: undefined,
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
      expect(services.analytics.handle.args).to.eql([[output(context, 'runtime')]]);
      expect(services.tts.handle.args).to.eql([[output(context, 'analytics')]]);
      expect(services.speak.handle.args).to.eql([[output(context, 'tts')]]);
      expect(services.metrics.generalRequest.callCount).to.eql(1);
    });

    it('omits TTS if specified in config', async () => {
      const data = {
        body: { state: { foo: 'bar' }, request: 'request', config: { tts: false, selfDelegate: true } },
        headers: { versionID: 'versionID' },
        query: { locale: 'locale' },
        params: {},
      };
      const context = {
        state: data.body.state,
        userID: undefined,
        request: data.body.request,
        versionID: data.headers.versionID,
        data: { locale: data.query.locale },
      };

      const services = buildServices(context);

      const interactController = new Interact(services as any, null as any);

      expect(await interactController.handler(data as any)).to.eql({
        state: 'filter',
        request: context.request,
        trace: 'trace',
      });

      expect(services.tts.handle.callCount).to.eql(0);
      expect(services.speak.handle.args).to.eql([[output(context, 'analytics')]]);
    });
  });

  it('omits TTS if tts is unspecified', async () => {
    const data = {
      body: { state: { foo: 'bar' }, request: 'request', config: { selfDelegate: true } },
      headers: { versionID: 'versionID' },
      params: {},
      query: { locale: 'locale' },
    };
    const context = {
      state: data.body.state,
      userID: undefined,
      request: data.body.request,
      versionID: data.headers.versionID,
      data: { locale: data.query.locale },
    };

    const services = buildServices(context);

    const interactController = new Interact(services as any, null as any);
    expect(await interactController.handler(data as any)).to.eql({
      state: 'filter',
      request: context.request,
      trace: 'trace',
    });
    expect(services.tts.handle.callCount).to.eql(0);
  });

  it('autoDelegates', async () => {
    const data = {
      body: { state: { foo: 'bar' }, request: 'request' },
      headers: {
        versionID: 'versionID',
        authorization: 'auth',
        origin: 'origin',
        sessionid: 'sessionid',
        platform: 'platform',
      },
      params: {},
      query: { locale: 'locale' },
    };
    const context = {
      state: data.body.state,
      userID: undefined,
      request: data.body.request,
      versionID: data.headers.versionID,
      data: {
        locale: data.query.locale,
        config: {},
        reqHeaders: {
          authorization: data.headers.authorization,
          origin: data.headers.origin,
          sessionid: data.headers.sessionid,
          platform: data.headers.platform,
        },
      },
    };

    const finalState = { state: 'finalState', request: 'finalRequest', trace: 'finalTrace' };
    const turnBuilder = {
      addHandlers: sinon.stub(),
      resolve: sinon.stub().resolves('resolved-state'),
      handle: 'handle',
    };
    const services = {
      ...buildServices(context),
      utils: {
        autoDelegate: sinon.stub().resolves(finalState),
        TurnBuilder: sinon.stub().returns(turnBuilder),
      },
    };

    const interactController = new Interact(services as any, null as any);
    expect(await interactController.handler(data as any)).to.eql('resolved-state');
    expect(services.utils.TurnBuilder.args).to.eql([[services.state]]);
    expect(turnBuilder.addHandlers.args).to.eql([
      [services.asr, services.nlu, services.slots, services.dialog, services.runtime],
      [services.analytics],
      [services.speak, services.filter],
    ]);
    expect(services.utils.autoDelegate.args).to.eql([[turnBuilder, context]]);
    expect(await turnBuilder.resolve.args[0][0]).to.eql(finalState);
  });
});
