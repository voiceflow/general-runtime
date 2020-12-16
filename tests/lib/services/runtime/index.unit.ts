import { EventType } from '@voiceflow/runtime';
import { expect } from 'chai';
import sinon from 'sinon';

import RuntimeManager, { utils as defaultUtils } from '@/lib/services/runtime';
import { TurnType, Variables } from '@/lib/services/runtime/types';

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
        setEvent: sinon.stub(),
        turn: {
          get: sinon.stub().returns(false), // TurnType.END false
          set: sinon.stub(),
        },
        storage: {
          set: sinon.stub(),
          get: sinon.stub().returns(null), // no stream
        },
        stack: {
          isEmpty: sinon.stub().returns(false), // stack no empty
        },
        variables: { set: sinon.stub() },
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
        dataAPI: { getProgram: 'api' },
      };

      const utils = {
        Client: sinon.stub().returns(client),
        Handlers: () => 'foo',
      };

      const config = {};

      const runtimeManager = new RuntimeManager({ ...services, utils: { ...defaultUtils, ...utils } } as any, config as any);

      const state = { foo2: 'bar2' };
      const request = { foo3: 'bar3' };
      const context = { state, request, versionID: VERSION_ID } as any;
      expect(await runtimeManager.handle(context)).to.eql({ state: rawState, trace, request, versionID: VERSION_ID });
      expect(client.createRuntime.args).to.eql([
        [
          VERSION_ID,
          state,
          request,
          {
            api: { getProgram: services.dataAPI.getProgram },
            handlers: 'foo',
          },
        ],
      ]);
      expect(runtime.setEvent.args[0][0]).to.eql(EventType.handlerWillHandle);
      const fn = runtime.setEvent.args[0][1];
      const event = { runtime: { foo4: 'bar3' }, node: { id: 'node-id' } };
      fn(event);
      expect(runtime.trace.addTrace.args).to.eql([[{ type: 'block', payload: { blockID: event.node.id } }]]);
      expect(runtime.turn.set.args).to.eql([
        [TurnType.REQUEST, request],
        [TurnType.PREVIOUS_OUTPUT, null],
      ]);
      expect(runtime.variables.set.args).to.eql([[Variables.TIMESTAMP, Math.floor(clock.now / 1000)]]);
      expect(runtime.update.callCount).to.eql(1);
    });

    it('stack empty', async () => {
      const rawState = { foo: 'bar' };
      const trace = { foo1: 'bar1' };

      const runtime = {
        setEvent: sinon.stub(),
        turn: {
          set: sinon.stub(),
          get: sinon.stub(),
        },
        storage: {
          set: sinon.stub(),
          get: sinon.stub().returns({ action: 'random' }), // stream
        },
        stack: {
          isEmpty: sinon.stub().returns(true), // stack is empty
        },
        variables: { set: sinon.stub() },
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
        dataAPI: { getProgram: 'api' },
      };

      const utils = {
        Client: sinon.stub().returns(client),
        Handlers: sinon.stub().returns([]),
      };

      const config = {};

      const runtimeManager = new RuntimeManager({ ...services, utils: { ...defaultUtils, ...utils } } as any, config as any);

      const context = { state: {}, request: {}, versionID: VERSION_ID } as any;
      expect(await runtimeManager.handle(context)).to.eql({ state: rawState, trace, request: {}, versionID: VERSION_ID });
      expect(utils.Handlers.callCount).to.eql(1);
      expect(runtime.trace.addTrace.args[0]).to.eql([{ type: 'end' }]);
    });
  });
});
