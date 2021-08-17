import { Request, Version } from '@voiceflow/base-types';
import { Constants } from '@voiceflow/general-types';
import { expect } from 'chai';
import sinon from 'sinon';

import RepeatHandler from '@/lib/services/runtime/handlers/repeat';
import { FrameType, StorageType, TurnType } from '@/lib/services/runtime/types';

describe('repeat handler', () => {
  const repeatHandler = RepeatHandler();
  const intentRequest = { type: Request.RequestType.INTENT, payload: { intent: { name: Constants.IntentName.REPEAT }, entities: [] } };

  describe('can handle', () => {
    it('true', () => {
      const runtime = { getRequest: sinon.stub().returns(intentRequest), storage: { get: sinon.stub().returns(Version.RepeatType.ALL) } };
      expect(repeatHandler.canHandle(runtime as any)).to.eql(true);
      expect(runtime.storage.get.args[0][0]).to.eql(StorageType.REPEAT);
      expect(runtime.getRequest.callCount).to.eql(1);
    });

    it('false', () => {
      expect(
        repeatHandler.canHandle({ getRequest: sinon.stub().returns(null), storage: { get: sinon.stub().returns(Version.RepeatType.ALL) } } as any)
      ).to.eql(false);
      expect(
        repeatHandler.canHandle({
          getRequest: sinon.stub().returns(intentRequest),
          storage: { get: sinon.stub().returns(Version.RepeatType.OFF) },
        } as any)
      ).to.eql(false);
      expect(
        repeatHandler.canHandle({
          getRequest: sinon.stub().returns({ payload: { intent: { name: 'foo' } } }),
          storage: { get: sinon.stub().returns(100) },
        } as any)
      ).to.eql(false);
    });
  });

  describe('handle', () => {
    it('minimal repeat', () => {
      const frame = {
        getNodeID: sinon.stub().returns('node'),
        storage: { get: sinon.stub().returns('foo') },
      };

      const runtime = {
        storage: {
          get: sinon.stub().returns(Version.RepeatType.OFF),
          produce: sinon.stub(),
        },
        turn: {
          get: sinon.stub(),
        },
        stack: {
          top: sinon.stub().returns(frame),
        },
      };

      repeatHandler.handle(runtime as any);

      expect(runtime.storage.get.args[0][0]).to.eql(StorageType.REPEAT);
      expect(runtime.stack.top.callCount).to.eql(1);
      expect(frame.storage.get.args[0][0]).to.eql(FrameType.SPEAK);
      expect(runtime.turn.get.callCount).to.eql(0);

      const fn = runtime.storage.produce.args[0][0];

      const draft = {
        [StorageType.OUTPUT]: 'before ',
      };

      fn(draft);
      expect(draft[StorageType.OUTPUT]).to.eql('before foo');
    });

    it('max repeat', () => {
      const frame = {
        getNodeID: sinon.stub().returns('node'),
        storage: { get: sinon.stub().returns('foo') },
      };

      const runtime = {
        storage: {
          get: sinon.stub().returns(Version.RepeatType.ALL),
          produce: sinon.stub(),
        },
        turn: {
          get: sinon.stub().returns('test'),
        },
        stack: {
          top: sinon.stub().returns(frame),
        },
      };

      repeatHandler.handle(runtime as any);

      expect(runtime.storage.get.args[0][0]).to.eql(StorageType.REPEAT);
      expect(runtime.stack.top.callCount).to.eql(1);
      expect(frame.storage.get.callCount).to.eql(0);
      expect(runtime.turn.get.args[0][0]).to.eql(TurnType.PREVIOUS_OUTPUT);

      const fn = runtime.storage.produce.args[0][0];

      const draft = {
        [StorageType.OUTPUT]: 'before ',
      };

      fn(draft);
      expect(draft[StorageType.OUTPUT]).to.eql('before test');
    });
  });
});
