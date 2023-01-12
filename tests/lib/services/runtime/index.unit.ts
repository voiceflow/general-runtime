import { BaseNode, BaseRequest } from '@voiceflow/base-types';
import { expect } from 'chai';
import sinon from 'sinon';

import RuntimeManager, { utils as defaultUtils } from '@/lib/services/runtime';
import { TurnType, Variables } from '@/lib/services/runtime/types';
import DebugLogging from '@/runtime/lib/Runtime/DebugLogging';

const VERSION_ID = 'version_id';
const PROJECT_ID = 'project_id';
const USER_ID = 'user_id';

describe('runtime manager unit tests', () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
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
        variables: { set: sinon.stub() },
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);

      const client = {
        setEvent: sinon.stub(),
        createRuntime: sinon.stub().returns(runtime),
      };

      const services = {
        dataAPI: { getProgram: 'service-api' },
        analyticsClient: { track: sinon.stub().resolves() },
      };

      const utils = {
        Client: sinon.stub().returns(client),
        Handlers: () => 'foo',
      };

      const config = {};

      const runtimeManager = new RuntimeManager(
        { ...services, utils: { ...defaultUtils, ...utils } } as any,
        config as any
      );

      const state = { foo2: 'bar2' };
      const request = {
        type: BaseRequest.RequestType.INTENT,
        payload: {},
      };
      const context = {
        state,
        request,
        versionID: VERSION_ID,
        version: { id: VERSION_ID },
        project: { id: PROJECT_ID },
        data: { api: { getProgram: 'api' } },
      } as any;
      expect(await runtimeManager.handle(context)).to.eql({
        state: rawState,
        trace,
        userID: undefined,
        request,
        versionID: VERSION_ID,
        version: { id: VERSION_ID },
        project: { id: PROJECT_ID },
        data: { api: { getProgram: 'api' } },
      });
      expect(utils.Client.firstCall.args[0].api).to.eql({ getProgram: 'api' });
      expect(client.createRuntime.args).to.eql([
        [
          {
            versionID: VERSION_ID,
            state,
            request,
            version: { id: VERSION_ID },
            project: { id: PROJECT_ID },
          },
        ],
      ]);
      expect(runtime.update.callCount).to.eql(1);
    });

    it('stop types', async () => {
      const rawState = { foo: 'bar' };
      const trace = { foo1: 'bar1' };

      const runtime = {
        update: sinon.stub(),
        getRawState: sinon.stub().returns(rawState),
        getFinalState: sinon.stub().returns(rawState),
        turn: { set: sinon.stub() },
        trace: { get: sinon.stub().returns(trace), addTrace: sinon.stub() },
        variables: { set: sinon.stub() },
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);

      const client = {
        setEvent: sinon.stub(),
        createRuntime: sinon.stub().returns(runtime),
      };

      const services = {
        dataAPI: { getProgram: 'service-api' },
        analyticsClient: { track: sinon.stub().resolves() },
      };

      const utils = {
        Client: sinon.stub().returns(client),
        Handlers: () => 'foo',
      };

      const config = {};

      const runtimeManager = new RuntimeManager(
        { ...services, utils: { ...defaultUtils, ...utils } } as any,
        config as any
      );

      const state = { foo2: 'bar2' };
      const request = {
        type: BaseRequest.RequestType.TEXT,
        payload: 'hi',
      };
      const context = {
        state,
        userID: USER_ID,
        request,
        versionID: VERSION_ID,
        version: { id: VERSION_ID },
        project: { id: PROJECT_ID },
        data: { api: { getProgram: 'api' }, config: { stopTypes: ['t1', 't2'] } },
      } as any;

      expect(await runtimeManager.handle(context)).to.eql({
        state: rawState,
        trace,
        userID: USER_ID,
        request,
        versionID: VERSION_ID,
        version: { id: VERSION_ID },
        project: { id: PROJECT_ID },
        data: { api: { getProgram: 'api' }, config: { stopTypes: ['t1', 't2'] } },
      });
      expect(utils.Client.firstCall.args[0].api).to.eql({ getProgram: 'api' });

      expect(client.createRuntime.args).to.eql([
        [
          {
            versionID: VERSION_ID,
            state,
            request,
            version: { id: VERSION_ID },
            project: { id: PROJECT_ID },
          },
        ],
      ]);
      expect(runtime.update.callCount).to.eql(1);
      expect(runtime.turn.set.args).to.eql([[TurnType.STOP_TYPES, context.data.config.stopTypes]]);
    });

    it('stack empty', async () => {
      const rawState = { foo: 'bar' };
      const trace = { foo1: 'bar1' };
      const runtime = {
        update: sinon.stub(),
        getRawState: sinon.stub().returns(rawState),
        trace: { get: sinon.stub().returns(trace), addTrace: sinon.stub() },
        getFinalState: sinon.stub().returns(rawState),
        variables: { set: sinon.stub() },
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);

      const client = {
        setEvent: sinon.stub(),
        createRuntime: sinon.stub().returns(runtime),
      };

      const services = {
        dataAPI: { getProgram: 'service-api' },
        analyticsClient: { track: sinon.stub().resolves() },
      };

      const utils = {
        Client: sinon.stub().returns(client),
        Handlers: sinon.stub().returns([]),
      };

      const config = {};

      const runtimeManager = new RuntimeManager(
        { ...services, utils: { ...defaultUtils, ...utils } } as any,
        config as any
      );

      const request = {
        type: BaseRequest.RequestType.INTENT,
        payload: {},
      };
      const state = { foo: 'bar' };
      const context = {
        state,
        userID: USER_ID,
        request,
        versionID: VERSION_ID,
        version: { id: VERSION_ID },
        project: { id: PROJECT_ID },
        data: { api: { getProgram: 'api' } },
      } as any;

      expect(await runtimeManager.handle(context)).to.eql({
        state: rawState,
        trace,
        userID: USER_ID,
        request,
        versionID: VERSION_ID,
        version: { id: VERSION_ID },
        project: { id: PROJECT_ID },
        data: { api: { getProgram: 'api' } },
      });
      expect(utils.Client.firstCall.args[0].api).to.eql({ getProgram: 'api' });
      expect(client.createRuntime.args).to.eql([
        [
          {
            versionID: VERSION_ID,
            state,
            request,
            version: { id: VERSION_ID },
            project: { id: PROJECT_ID },
          },
        ],
      ]);
      expect(utils.Handlers.callCount).to.eql(1);
    });

    it('matched intent debug trace', async () => {
      const rawState = { foo: 'bar' };
      const trace = { foo1: 'bar1' };
      const timestamp = Math.floor(Date.now() / 1000);
      const runtime = {
        update: sinon.stub(),
        getRawState: sinon.stub().returns(rawState),
        trace: { get: sinon.stub().returns(trace), addTrace: sinon.stub(), debug: sinon.stub() },
        variables: { set: sinon.stub() },
        getFinalState: sinon.stub().returns(rawState),
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);

      const client = {
        setEvent: sinon.stub(),
        createRuntime: sinon.stub().returns(runtime),
      };

      const services = {
        dataAPI: { getProgram: 'service-api' },
        analyticsClient: { track: sinon.stub().resolves() },
      };

      const utils = {
        Client: sinon.stub().returns(client),
        Handlers: sinon.stub().returns([]),
      };

      const config = {};

      const runtimeManager = new RuntimeManager(
        { ...services, utils: { ...defaultUtils, ...utils } } as any,
        config as any
      );

      const request = {
        type: BaseRequest.RequestType.INTENT,
        payload: {
          query: 'hello world',
          intent: { name: 'name' },
          entities: [],
          confidence: 0.86123,
        },
      };
      const state = { foo: 'bar' };
      const context = {
        state,
        request,
        versionID: VERSION_ID,
        data: { api: { getProgram: 'api' } },
      } as any;

      await runtimeManager.handle(context);

      expect(runtime.trace.debug.args).to.eql([
        ['matched intent **name** - confidence interval _86.12%_', BaseNode.NodeType.INTENT],
      ]);
      expect(runtime.variables.set.args).to.eql([
        ['intent_confidence', 86.12],
        ['last_utterance', 'hello world'],
        ['timestamp', timestamp],
      ]);
    });

    it('sets user_id variable if userID passed in', async () => {
      const rawState = { foo: 'bar' };
      const trace = { foo1: 'bar1' };

      const runtime = {
        update: sinon.stub(),
        getRawState: sinon.stub().returns(rawState),
        trace: { get: sinon.stub().returns(trace), addTrace: sinon.stub() },
        getFinalState: sinon.stub().returns(rawState),
        variables: { set: sinon.stub() },
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);

      const client = {
        setEvent: sinon.stub(),
        createRuntime: sinon.stub().returns(runtime),
      };

      const services = {
        dataAPI: { getProgram: 'service-api' },
        analyticsClient: { track: sinon.stub().resolves() },
      };

      const utils = {
        Client: sinon.stub().returns(client),
        Handlers: () => 'foo',
      };

      const config = {};

      const runtimeManager = new RuntimeManager(
        { ...services, utils: { ...defaultUtils, ...utils } } as any,
        config as any
      );

      const state = { foo2: 'bar2' };
      const request = {
        type: BaseRequest.RequestType.INTENT,
        payload: {},
      };
      const context = {
        state,
        userID: 'someUserId',
        request,
        versionID: VERSION_ID,
        version: { id: VERSION_ID },
        project: { id: PROJECT_ID },
        data: { api: { getProgram: 'api' } },
      } as any;

      expect(await runtimeManager.handle(context)).to.eql({
        state: rawState,
        trace,
        userID: 'someUserId',
        request,
        versionID: VERSION_ID,
        version: { id: VERSION_ID },
        project: { id: PROJECT_ID },
        data: { api: { getProgram: 'api' } },
      });
      expect(utils.Client.firstCall.args[0].api).to.eql({ getProgram: 'api' });
      expect(client.createRuntime.args).to.eql([
        [
          {
            versionID: VERSION_ID,
            state,
            request,
            version: { id: VERSION_ID },
            project: { id: PROJECT_ID },
          },
        ],
      ]);
      expect(runtime.update.callCount).to.eql(1);
      expect(runtime.variables.set.args).to.eql([
        [Variables.TIMESTAMP, 0],
        [Variables.USER_ID, 'someUserId'],
      ]);
    });
  });
});
