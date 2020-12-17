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
    });
  });
});
