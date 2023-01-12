import { expect } from 'chai';
import _ from 'lodash';
import sinon from 'sinon';

import { AbstractLifecycle, EventType } from '@/runtime/lib/Lifecycle';
import Runtime, { Action } from '@/runtime/lib/Runtime';
import * as cycleStack from '@/runtime/lib/Runtime/cycleStack';
import * as ProgramManager from '@/runtime/lib/Runtime/utils/programManager';

describe('Runtime unit', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('constructor', () => {
    const runtime = new Runtime({
      versionID: null,
      state: { stack: [] },
      request: undefined,
      options: {},
      version: null,
    } as any);
    runtime.callEvent = sinon.stub().returns('foo');
    // assert that events are being initiated correctly
    expect(_.get(runtime.stack, 'handlers.willChange')()).to.eql('foo');
  });

  it('getRequest', () => {
    const input = { type: 'req', payload: {} };
    const runtime = new Runtime({
      versionID: null,
      state: { stack: [] },
      request: input,
      options: {},
      version: null,
    } as any);
    expect(runtime.getRequest()).to.eql(input);
  });

  it('setAction', () => {
    const runtime = new Runtime({
      versionID: null,
      state: { stack: [] },
      request: undefined,
      options: {},
      version: null,
    } as any);
    const action = Action.RUNNING;
    runtime.setAction(action as any);
    expect(_.get(runtime, 'action')).to.eql(action);
  });

  it('getAction', () => {
    const runtime = new Runtime({
      versionID: null,
      state: { stack: [] },
      request: undefined,
      options: {},
      version: null,
    } as any);
    const action = Action.RUNNING;
    runtime.setAction(action as any);
    expect(runtime.getAction()).to.eql(action);
  });

  it('end', () => {
    const runtime = new Runtime({
      versionID: null,
      state: { stack: [] },
      request: undefined,
      options: {},
      version: null,
    } as any);
    runtime.end();
    expect(runtime.getAction()).to.eql(Action.END);
  });

  it('hasEnded', () => {
    const runtime = new Runtime({
      versionID: null,
      state: { stack: [] },
      request: undefined,
      options: {},
      version: null,
    } as any);
    expect(runtime.hasEnded()).to.eql(false);
    runtime.end();
    expect(runtime.hasEnded()).to.eql(true);
  });

  it('getProgram', () => {
    const program = { foo: 'bar' };
    const getProgram = sinon.stub().returns(program);
    const ProgramManagerStub = sinon.stub(ProgramManager, 'default');
    ProgramManagerStub.returns({ get: getProgram });

    const runtime = new Runtime({
      versionID: null,
      state: { stack: [] },
      request: undefined,
      options: { api: { getProgram } },
      version: null,
    } as any);

    const programId = 'program-id';
    expect(runtime.getProgram(programId)).to.eql(program);
    expect(ProgramManagerStub.calledWithNew()).to.eql(true);
    expect(ProgramManagerStub.args).to.eql([[runtime]]);
    expect(getProgram.args).to.eql([[programId]]);
  });

  it('getHandlers', () => {
    const handlers = [{}, {}];

    const runtime = new Runtime({
      versionID: null,
      state: { stack: [] },
      request: undefined,
      options: { handlers },
      version: null,
    } as any);

    expect(runtime.getHandlers()).to.eql(handlers);
  });

  it('getRawState', () => {
    const runtime = new Runtime({
      versionID: null,
      state: { stack: [] },
      request: undefined,
      options: {},
      version: null,
    } as any);
    expect(runtime.getRawState()).to.eql({ turn: {}, stack: [], storage: {}, variables: {} });
  });

  describe('getFinalState', () => {
    it('throws', () => {
      const runtime = new Runtime({
        versionID: null,
        state: { stack: [] },
        request: undefined,
        options: {},
        version: null,
      } as any);
      expect(() => {
        runtime.getFinalState();
      }).to.throw('runtime not updated');
    });

    it('returns', () => {
      const runtime = new Runtime({
        versionID: null,
        state: { stack: [] },
        request: undefined,
        options: {},
        version: null,
      } as any);
      runtime.setAction(Action.END);
      expect(runtime.getFinalState()).to.eql({ stack: [], storage: {}, variables: {} });
    });
  });

  describe('update', () => {
    it('catch error', async () => {
      const runtime = new Runtime({
        versionID: undefined,
        state: { stack: [] },
        request: undefined,
        options: {},
        version: null,
      } as any);
      runtime.setAction(Action.REQUEST);
      const callEventStub = sinon.stub().resolves();
      runtime.callEvent = callEventStub;
      await runtime.update();
      expect(callEventStub.callCount).to.eql(2);
      expect(callEventStub.args[0]).to.eql([EventType.updateWillExecute, {}]);
      expect(callEventStub.args[1][0]).to.eql(EventType.updateDidCatch);
      expect(Object.keys(callEventStub.args[1][1])).to.eql(['error']);
      expect(callEventStub.args[1][1].error.message).to.eql('runtime updated twice');
    });

    it('empty request', async () => {
      const cycleStackStub = sinon.stub(cycleStack, 'default');
      const runtime = new Runtime({
        versionID: undefined,
        state: { stack: [] },
        request: undefined,
        options: {},
        version: null,
      } as any);
      const callEventStub = sinon.stub();
      runtime.callEvent = callEventStub;
      const setActionStub = sinon.stub();
      runtime.setAction = setActionStub;
      await runtime.update();
      expect(callEventStub.args).to.eql([
        [EventType.updateWillExecute, {}],
        [EventType.updateDidExecute, {}],
      ]);
      expect(setActionStub.args).to.eql([[Action.REQUEST]]);
      expect(cycleStackStub.args).to.eql([[runtime]]);
    });

    it('request action', async () => {
      const cycleStackStub = sinon.stub(cycleStack, 'default');
      const runtime = new Runtime({
        versionID: undefined,
        state: { stack: [] },
        request: true,
        options: {},
        version: null,
      } as any);
      const callEventStub = sinon.stub();
      runtime.callEvent = callEventStub;
      const setActionStub = sinon.stub();
      runtime.setAction = setActionStub;
      await runtime.update();
      expect(callEventStub.args).to.eql([
        [EventType.updateWillExecute, {}],
        [EventType.updateDidExecute, {}],
      ]);
      expect(setActionStub.args).to.eql([[Action.REQUEST]]);
      expect(cycleStackStub.args).to.eql([[runtime]]);
    });

    it('injectBaseProgram', async () => {
      const versionID = 'version id';
      const cycleStackStub = sinon.stub(cycleStack, 'default');
      const program = { commands: [] };
      const runtime = new Runtime({
        versionID,
        state: { stack: [] },
        request: true,
        options: { api: { getProgram: sinon.stub().resolves(program) } },
        version: null,
      } as any);

      const callEventStub = sinon.stub();
      runtime.callEvent = callEventStub;
      const setActionStub = sinon.stub();
      runtime.setAction = setActionStub;
      await runtime.update();
      expect(callEventStub.args[0][0]).to.eql(EventType.stackWillChange);
      expect(callEventStub.args[1][0]).to.eql(EventType.stackDidChange);
      expect(callEventStub.args[2]).to.eql([EventType.updateWillExecute, {}]);
      expect(callEventStub.args[3]).to.eql([EventType.updateDidExecute, {}]);
      expect(setActionStub.args).to.eql([[Action.REQUEST]]);
      expect(cycleStackStub.args).to.eql([[runtime]]);
      expect(runtime.stack.get(0)?.getProgramID()).to.eql(versionID);
    });
  });

  it('callEvent', async () => {
    const callEventStub = sinon.stub(AbstractLifecycle.prototype, 'callEvent');
    const runtime = new Runtime({
      versionID: null,
      state: { stack: [] },
      request: undefined,
      options: {},
      version: null,
    } as any);
    const type = 'type';
    const event = 'event';
    await runtime.callEvent(type as any, event);
    expect(callEventStub.args).to.eql([[type, event, runtime]]);
  });
});
