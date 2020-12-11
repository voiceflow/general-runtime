import { EventType } from '@voiceflow/runtime';
import { expect } from 'chai';
import sinon from 'sinon';

import PrototypeManager, { utils as defaultUtils } from '@/lib/services/runtime';
import { TEST_VERSION_ID, TurnType, Variables } from '@/lib/services/runtime/types';

describe('prototype manager unit tests', () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers(Date.now()); // fake Date.now
  });
  afterEach(() => {
    clock.restore(); // restore Date.now
    sinon.restore();
  });

  describe('invoke', () => {
    it('works correctly', async () => {
      const rawState = { foo: 'bar' };
      const trace = { foo1: 'bar1' };

      const context = {
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
      };

      const client = {
        setEvent: sinon.stub(),
        createContext: sinon.stub().returns(context),
      };

      const services = {
        dataAPI: { getProgram: 'api' },
      };

      const utils = {
        Client: sinon.stub().returns(client),
        Handlers: () => 'foo',
      };

      const config = {};

      const prototypeManager = new PrototypeManager({ ...services, utils: { ...defaultUtils, ...utils } } as any, config as any);

      const state = { foo2: 'bar2' };
      const request = { foo3: 'bar3' };
      expect(await prototypeManager.invoke(state as any, request as any)).to.eql({ ...rawState, trace });
      expect(client.createContext.args).to.eql([
        [
          TEST_VERSION_ID,
          state,
          request,
          {
            api: { getProgram: services.dataAPI.getProgram },
            handlers: 'foo',
          },
        ],
      ]);
      expect(context.setEvent.args[0][0]).to.eql(EventType.handlerWillHandle);
      const fn = context.setEvent.args[0][1];
      const event = { context: { foo4: 'bar3' }, node: { id: 'node-id' } };
      fn(event);
      expect(context.trace.addTrace.args).to.eql([[{ type: 'block', payload: { blockID: event.node.id } }]]);
      expect(context.turn.set.args).to.eql([
        [TurnType.REQUEST, request],
        [TurnType.PREVIOUS_OUTPUT, null],
      ]);
      expect(context.variables.set.args).to.eql([[Variables.TIMESTAMP, Math.floor(clock.now / 1000)]]);
      expect(context.update.callCount).to.eql(1);
    });

    it('stack empty', async () => {
      const rawState = { foo: 'bar' };
      const trace = { foo1: 'bar1' };

      const context = {
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
      };

      const client = {
        setEvent: sinon.stub(),
        createContext: sinon.stub().returns(context),
      };

      const services = {
        dataAPI: { getProgram: 'api' },
      };

      const utils = {
        Client: sinon.stub().returns(client),
        Handlers: sinon.stub().returns([]),
      };

      const config = {};

      const prototypeManager = new PrototypeManager({ ...services, utils: { ...defaultUtils, ...utils } } as any, config as any);

      expect(await prototypeManager.invoke({} as any, {} as any)).to.eql({ ...rawState, trace });
      expect(utils.Handlers.callCount).to.eql(1);
      expect(context.trace.addTrace.args[0]).to.eql([{ type: 'end' }]);
    });
  });
});
