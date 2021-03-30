import { RequestType } from '@voiceflow/general-types';
import { expect } from 'chai';
import sinon from 'sinon';

import RuntimeManager, { utils as defaultUtils } from '@/lib/services/runtime';

const VERSION_ID = 'version_id';

describe('runtime manager unit tests', () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers(Date.now()); // fake Date.now
  });
  afterEach(() => {
    clock.restore(); // restore Date.now
    sinon.restore();
  });

  describe('handle', () => {
    it('works correctly', async () => {
      const rawState = { foo: 'bar' };
      const trace = { foo1: 'bar1' };

      const runtime = {
        update: sinon.stub(),
        getRawState: sinon.stub().returns(rawState),
        trace: { get: sinon.stub().returns(trace), addTrace: sinon.stub() },
        getFinalState: sinon.stub().returns(rawState),
      };

      const client = {
        setEvent: sinon.stub(),
        createRuntime: sinon.stub().returns(runtime),
      };

      const services = {
        dataAPI: { getProgram: 'service-api' },
      };

      const utils = {
        Client: sinon.stub().returns(client),
        Handlers: () => 'foo',
      };

      const config = {};

      const runtimeManager = new RuntimeManager({ ...services, utils: { ...defaultUtils, ...utils } } as any, config as any);

      const state = { foo2: 'bar2' };
      const request = {
        type: RequestType.INTENT,
        payload: {},
      };
      const context = { state, request, versionID: VERSION_ID, data: { api: { getProgram: 'api' } } } as any;
      expect(await runtimeManager.handle(context)).to.eql({
        state: rawState,
        trace,
        request,
        versionID: VERSION_ID,
        data: { api: { getProgram: 'api' } },
      });
      expect(utils.Client.firstCall.args[0].api).to.eql({ getProgram: 'api' });
      expect(client.createRuntime.args).to.eql([[VERSION_ID, state, request]]);
      expect(runtime.update.callCount).to.eql(1);
    });

    it('stack empty', async () => {
      const rawState = { foo: 'bar' };
      const trace = { foo1: 'bar1' };
      const runtime = {
        update: sinon.stub(),
        getRawState: sinon.stub().returns(rawState),
        trace: { get: sinon.stub().returns(trace), addTrace: sinon.stub() },
        getFinalState: sinon.stub().returns(rawState),
      };

      const client = {
        setEvent: sinon.stub(),
        createRuntime: sinon.stub().returns(runtime),
      };

      const services = {
        dataAPI: { getProgram: 'service-api' },
      };

      const utils = {
        Client: sinon.stub().returns(client),
        Handlers: sinon.stub().returns([]),
      };

      const config = {};

      const runtimeManager = new RuntimeManager({ ...services, utils: { ...defaultUtils, ...utils } } as any, config as any);

      const request = {
        type: RequestType.INTENT,
        payload: {},
      };
      const state = { foo: 'bar' };
      const context = { state, request, versionID: VERSION_ID, data: { api: { getProgram: 'api' } } } as any;

      expect(await runtimeManager.handle(context)).to.eql({
        state: rawState,
        trace,
        request,
        versionID: VERSION_ID,
        data: { api: { getProgram: 'api' } },
      });
      expect(utils.Client.firstCall.args[0].api).to.eql({ getProgram: 'api' });
      expect(client.createRuntime.args).to.eql([[VERSION_ID, state, request]]);
      expect(utils.Handlers.callCount).to.eql(1);
    });

    it('matched intent debug trace', async () => {
      const rawState = { foo: 'bar' };
      const trace = { foo1: 'bar1' };
      const runtime = {
        update: sinon.stub(),
        getRawState: sinon.stub().returns(rawState),
        trace: { get: sinon.stub().returns(trace), addTrace: sinon.stub(), debug: sinon.stub() },
        variables: { set: sinon.stub() },
        getFinalState: sinon.stub().returns(rawState),
      };

      const client = {
        setEvent: sinon.stub(),
        createRuntime: sinon.stub().returns(runtime),
      };

      const services = {
        dataAPI: { getProgram: 'service-api' },
      };

      const utils = {
        Client: sinon.stub().returns(client),
        Handlers: sinon.stub().returns([]),
      };

      const config = {};

      const runtimeManager = new RuntimeManager({ ...services, utils: { ...defaultUtils, ...utils } } as any, config as any);

      const request = {
        type: RequestType.INTENT,
        payload: {
          query: '',
          intent: { name: 'name' },
          entities: [],
          confidence: 0.86123,
        },
      };
      const state = { foo: 'bar' };
      const context = { state, request, versionID: VERSION_ID, data: { api: { getProgram: 'api' } } } as any;

      await runtimeManager.handle(context);

      expect(runtime.trace.debug.args).to.eql([['matched intent **name** - confidence interval _86.12%_']]);
      expect(runtime.variables.set.args).to.eql([[86.12]]);
    });
  });
});
