import { Request, Version } from '@voiceflow/base-types';
import { Constants } from '@voiceflow/general-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { RepeatHandler } from '@/lib/services/runtime/handlers/repeat';
import { FrameType, StorageType, TurnType } from '@/lib/services/runtime/types';

describe('repeat handler', () => {
  const intentRequest = { type: Request.RequestType.INTENT, payload: { intent: { name: Constants.IntentName.REPEAT }, entities: [] } };

  afterEach(() => {
    sinon.restore();
  });

  describe('can handle', () => {
    it('true', () => {
      const runtime = { getRequest: sinon.stub().returns(intentRequest), storage: { get: sinon.stub().returns(Version.RepeatType.ALL) } };
      expect(RepeatHandler({} as any).canHandle(runtime as any)).to.eql(true);
      expect(runtime.storage.get.args[0][0]).to.eql(StorageType.REPEAT);
      expect(runtime.getRequest.callCount).to.eql(1);
    });

    it('false', () => {
      expect(
        RepeatHandler({} as any).canHandle({
          getRequest: sinon.stub().returns(null),
          storage: { get: sinon.stub().returns(Version.RepeatType.ALL) },
        } as any)
      ).to.eql(false);
      expect(
        RepeatHandler({} as any).canHandle({
          getRequest: sinon.stub().returns(intentRequest),
          storage: { get: sinon.stub().returns(Version.RepeatType.OFF) },
        } as any)
      ).to.eql(false);
      expect(
        RepeatHandler({} as any).canHandle({
          getRequest: sinon.stub().returns({ payload: { intent: { name: 'foo' } } }),
          storage: { get: sinon.stub().returns(100) },
        } as any)
      ).to.eql(false);
    });
  });

  describe('handle', () => {
    it('minimal repeat', () => {
      const TRACE = '_trace1';
      const outputTrace = sinon.stub().returns(TRACE);
      const repeatHandler = RepeatHandler({ outputTrace } as any);

      const frame = {
        getNodeID: sinon.stub().returns('node'),
        storage: {
          get: sinon.stub().returns('foo'),
        },
      };

      const runtime = {
        storage: {
          get: sinon.stub().returns(Version.RepeatType.OFF),
        },
        turn: {
          get: sinon.stub(),
        },
        stack: {
          top: sinon.stub().returns(frame),
        },
        trace: {
          addTrace: sinon.stub(),
        },
      };

      repeatHandler.handle(runtime as any);

      expect(runtime.storage.get.args[0][0]).to.eql(StorageType.REPEAT);
      expect(runtime.stack.top.callCount).to.eql(1);
      expect(frame.storage.get.args).to.eql([[FrameType.OUTPUT]]);
      expect(runtime.turn.get.callCount).to.eql(0);
      expect(runtime.trace.addTrace.args).to.eql([[TRACE]]);
      expect(outputTrace.args).to.eql([[{ output: 'foo' }]]);
    });

    it('max repeat', () => {
      const TRACE = '_trace2';
      const outputTrace = sinon.stub().returns(TRACE);
      const repeatHandler = RepeatHandler({ outputTrace } as any);

      const frame = {
        getNodeID: sinon.stub().returns('node'),
        storage: { get: sinon.stub() },
      };

      const runtime = {
        storage: {
          get: sinon.stub().returns(Version.RepeatType.ALL),
        },
        turn: {
          get: sinon.stub().returns('test'),
        },
        stack: {
          top: sinon.stub().returns(frame),
        },
        trace: {
          addTrace: sinon.stub(),
        },
      };

      repeatHandler.handle(runtime as any);

      expect(runtime.storage.get.args[0][0]).to.eql(StorageType.REPEAT);
      expect(runtime.stack.top.callCount).to.eql(1);
      expect(frame.storage.get.callCount).to.eql(0);
      expect(runtime.turn.get.args[0][0]).to.eql(TurnType.PREVIOUS_OUTPUT);
      expect(runtime.trace.addTrace.args).to.eql([[TRACE]]);
      expect(outputTrace.args).to.eql([[{ output: 'test' }]]);
    });
  });
});
