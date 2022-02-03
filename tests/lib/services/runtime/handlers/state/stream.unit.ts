import { BaseRequest } from '@voiceflow/base-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { StreamStateHandler } from '@/lib/services/runtime/handlers/state/stream';
import { StorageType, StreamAction } from '@/lib/services/runtime/types';

describe('stream state handler unit tests', () => {
  describe('canHandle', () => {
    describe('false', () => {
      it('no stream play', () => {
        const runtime = { storage: { get: sinon.stub().returns(null) } };
        expect(StreamStateHandler(null as any).canHandle(null as any, runtime as any, null as any, null as any)).to.eql(false);
        expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
      });

      it('end action', () => {
        const runtime = { storage: { get: sinon.stub().returns({ action: StreamAction.END }) } };
        expect(StreamStateHandler(null as any).canHandle(null as any, runtime as any, null as any, null as any)).to.eql(false);
        expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY], [StorageType.STREAM_PLAY]]);
      });
    });

    it('true', () => {
      const runtime = { storage: { get: sinon.stub().returns({ action: 'play' }) } };
      expect(StreamStateHandler(null as any).canHandle(null as any, runtime as any, null as any, null as any)).to.eql(true);
      expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY], [StorageType.STREAM_PLAY]]);
    });
  });

  describe('handle', () => {
    describe('no request', () => {
      it('command can handle', () => {
        const output = 'next-id';
        const utils = {
          commandHandler: { canHandle: sinon.stub().returns(true), handle: sinon.stub().returns(output) },
        };
        const runtime = {
          getRequest: sinon.stub().returns(null),
          storage: { get: sinon.stub().returns({}), produce: sinon.stub() },
        };
        const variables = { var1: 'val1' };
        const handler = StreamStateHandler(utils as any);

        expect(handler.handle(null as any, runtime as any, variables as any, null as any)).to.eql(output);
        expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
        expect(runtime.getRequest.callCount).to.eql(1);
        expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);

        expect(runtime.storage.produce.callCount).to.eql(1);
        const fn1 = runtime.storage.produce.args[0][0];
        const draft1 = { [StorageType.STREAM_PLAY]: {} };
        fn1(draft1);
        expect(draft1).to.eql({ [StorageType.STREAM_PLAY]: { action: StreamAction.END } });

        expect(utils.commandHandler.handle.args).to.eql([[runtime, variables]]);
      });

      it('else', () => {
        const utils = {
          commandHandler: { canHandle: sinon.stub().returns(false) },
        };
        const runtime = {
          getRequest: sinon.stub().returns(null),
          storage: { get: sinon.stub().returns({}), produce: sinon.stub() },
          end: sinon.stub(),
        };
        const handler = StreamStateHandler(utils as any);

        expect(handler.handle(null as any, runtime as any, null as any, null as any)).to.eql(null);
        expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
        expect(runtime.getRequest.callCount).to.eql(1);

        expect(runtime.storage.produce.callCount).to.eql(1);
        const fn1 = runtime.storage.produce.args[0][0];
        const draft1 = { [StorageType.STREAM_PLAY]: {} };
        fn1(draft1);
        expect(draft1).to.eql({ [StorageType.STREAM_PLAY]: { action: StreamAction.NOEFFECT } });

        expect(runtime.end.callCount).to.eql(1);
      });
    });

    describe('with intent request', () => {
      describe('IntentName.PAUSE', () => {
        it('with pauseID', () => {
          const utils = {};
          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: { name: VoiceflowConstants.IntentName.PAUSE }, entities: [] } };
          const streamPlay = { pauseID: 'pause-id', nodeID: 'node-id', offset: 100 };
          const runtime = {
            getRequest: sinon.stub().returns(request),
            storage: { get: sinon.stub().returns(streamPlay), produce: sinon.stub(), set: sinon.stub() },
          };
          const variables = { var1: 'val1' };
          const handler = StreamStateHandler(utils as any);

          expect(handler.handle(null as any, runtime as any, variables as any, null as any)).to.eql(streamPlay.pauseID);
          expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
          expect(runtime.getRequest.callCount).to.eql(1);
          expect(runtime.storage.set.args).to.eql([[StorageType.STREAM_PAUSE, { id: streamPlay.nodeID, offset: streamPlay.offset }]]);

          expect(runtime.storage.produce.callCount).to.eql(1);
          const fn1 = runtime.storage.produce.args[0][0];
          const draft1 = { [StorageType.STREAM_PLAY]: {} };
          fn1(draft1);
          expect(draft1).to.eql({ [StorageType.STREAM_PLAY]: { action: StreamAction.END } });
        });

        it('no pauseID', () => {
          const utils = {};
          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: { name: VoiceflowConstants.IntentName.PAUSE }, entities: [] } };
          const runtime = {
            getRequest: sinon.stub().returns(request),
            storage: { get: sinon.stub().returns({}), produce: sinon.stub() },
            end: sinon.stub(),
          };
          const variables = { var1: 'val1' };
          const handler = StreamStateHandler(utils as any);

          expect(handler.handle(null as any, runtime as any, variables as any, null as any)).to.eql(null);
          expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
          expect(runtime.getRequest.callCount).to.eql(1);

          expect(runtime.storage.produce.callCount).to.eql(1);
          const fn1 = runtime.storage.produce.args[0][0];
          const draft1 = { [StorageType.STREAM_PLAY]: {} };
          fn1(draft1);
          expect(draft1).to.eql({ [StorageType.STREAM_PLAY]: { action: StreamAction.PAUSE } });

          expect(runtime.end.callCount).to.eql(1);
        });
      });

      it('IntentName.RESUME', () => {
        const utils = {};
        const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: { name: VoiceflowConstants.IntentName.RESUME }, entities: [] } };
        const runtime = {
          getRequest: sinon.stub().returns(request),
          storage: { get: sinon.stub().returns({}), produce: sinon.stub() },
          end: sinon.stub(),
        };
        const variables = { var1: 'val1' };
        const handler = StreamStateHandler(utils as any);

        expect(handler.handle(null as any, runtime as any, variables as any, null as any)).to.eql(null);
        expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
        expect(runtime.getRequest.callCount).to.eql(1);

        expect(runtime.storage.produce.callCount).to.eql(1);
        const fn1 = runtime.storage.produce.args[0][0];
        const draft1 = { [StorageType.STREAM_PLAY]: {} };
        fn1(draft1);
        expect(draft1).to.eql({ [StorageType.STREAM_PLAY]: { action: StreamAction.RESUME } });

        expect(runtime.end.callCount).to.eql(1);
      });

      it('IntentName.START_OVER', () => {
        const utils = {};
        const request = {
          type: BaseRequest.RequestType.INTENT,
          payload: { intent: { name: VoiceflowConstants.IntentName.START_OVER }, entities: [] },
        };
        const runtime = {
          getRequest: sinon.stub().returns(request),
          storage: { get: sinon.stub().returns({}), produce: sinon.stub() },
          end: sinon.stub(),
        };
        const variables = { var1: 'val1' };
        const handler = StreamStateHandler(utils as any);

        expect(handler.handle(null as any, runtime as any, variables as any, null as any)).to.eql(null);
        expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
        expect(runtime.getRequest.callCount).to.eql(1);

        expect(runtime.storage.produce.callCount).to.eql(1);
        const fn1 = runtime.storage.produce.args[0][0];
        const draft1 = { [StorageType.STREAM_PLAY]: {} };
        fn1(draft1);
        expect(draft1).to.eql({ [StorageType.STREAM_PLAY]: { action: StreamAction.START, offset: 0 } });

        expect(runtime.end.callCount).to.eql(1);
      });

      it('IntentName.REPEAT', () => {
        const utils = {};
        const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: { name: VoiceflowConstants.IntentName.REPEAT }, entities: [] } };
        const runtime = {
          getRequest: sinon.stub().returns(request),
          storage: { get: sinon.stub().returns({}), produce: sinon.stub() },
          end: sinon.stub(),
        };
        const variables = { var1: 'val1' };
        const handler = StreamStateHandler(utils as any);

        expect(handler.handle(null as any, runtime as any, variables as any, null as any)).to.eql(null);
        expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
        expect(runtime.getRequest.callCount).to.eql(1);

        expect(runtime.storage.produce.callCount).to.eql(1);
        const fn1 = runtime.storage.produce.args[0][0];
        const draft1 = { [StorageType.STREAM_PLAY]: {} };
        fn1(draft1);
        expect(draft1).to.eql({ [StorageType.STREAM_PLAY]: { action: StreamAction.START, offset: 0 } });

        expect(runtime.end.callCount).to.eql(1);
      });

      describe('NEXT', () => {
        it('intent', () => {
          const nextID = 'next-id';
          const utils = {};
          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: { name: VoiceflowConstants.IntentName.NEXT }, entities: [] } };
          const runtime = {
            getRequest: sinon.stub().returns(request),
            storage: { get: sinon.stub().returns({ nextID }), produce: sinon.stub() },
          };
          const variables = { var1: 'val1' };
          const handler = StreamStateHandler(utils as any);

          expect(handler.handle(null as any, runtime as any, variables as any, null as any)).to.eql(nextID);
          expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
          expect(runtime.getRequest.callCount).to.eql(1);

          expect(runtime.storage.produce.callCount).to.eql(1);
          const fn1 = runtime.storage.produce.args[0][0];
          const draft1 = { [StorageType.STREAM_PLAY]: {} };
          fn1(draft1);
          expect(draft1).to.eql({ [StorageType.STREAM_PLAY]: { action: StreamAction.END } });
        });

        it('streamAction', () => {
          const utils = {};
          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: { name: 'random' }, entities: [] } };
          const runtime = {
            getRequest: sinon.stub().returns(request),
            storage: { get: sinon.stub().returns({ action: StreamAction.NEXT }), produce: sinon.stub() },
          };
          const variables = { var1: 'val1' };
          const handler = StreamStateHandler(utils as any);

          expect(handler.handle(null as any, runtime as any, variables as any, null as any)).to.eql(null);
          expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
          expect(runtime.getRequest.callCount).to.eql(1);

          expect(runtime.storage.produce.callCount).to.eql(1);
          const fn1 = runtime.storage.produce.args[0][0];
          const draft1 = { [StorageType.STREAM_PLAY]: {} };
          fn1(draft1);
          expect(draft1).to.eql({ [StorageType.STREAM_PLAY]: { action: StreamAction.END } });
        });
      });

      describe('IntentName.PREVIOUS', () => {
        it('no previousId', () => {
          const utils = {};
          const request = {
            type: BaseRequest.RequestType.INTENT,
            payload: { intent: { name: VoiceflowConstants.IntentName.PREVIOUS }, entities: [] },
          };
          const runtime = {
            getRequest: sinon.stub().returns(request),
            storage: { get: sinon.stub().returns({}), produce: sinon.stub() },
          };
          const variables = { var1: 'val1' };
          const handler = StreamStateHandler(utils as any);

          expect(handler.handle(null as any, runtime as any, variables as any, null as any)).to.eql(null);
          expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
          expect(runtime.getRequest.callCount).to.eql(1);

          expect(runtime.storage.produce.callCount).to.eql(1);
          const fn1 = runtime.storage.produce.args[0][0];
          const draft1 = { [StorageType.STREAM_PLAY]: {} };
          fn1(draft1);
          expect(draft1).to.eql({ [StorageType.STREAM_PLAY]: { action: StreamAction.END } });
        });

        it('with previousId', () => {
          const previousID = 'previous-id';
          const utils = {};
          const request = {
            type: BaseRequest.RequestType.INTENT,
            payload: { intent: { name: VoiceflowConstants.IntentName.PREVIOUS }, entities: [] },
          };
          const runtime = {
            getRequest: sinon.stub().returns(request),
            storage: { get: sinon.stub().returns({ previousID }), produce: sinon.stub() },
          };
          const variables = { var1: 'val1' };
          const handler = StreamStateHandler(utils as any);

          expect(handler.handle(null as any, runtime as any, variables as any, null as any)).to.eql(previousID);
          expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
          expect(runtime.getRequest.callCount).to.eql(1);

          expect(runtime.storage.produce.callCount).to.eql(1);
          const fn1 = runtime.storage.produce.args[0][0];
          const draft1 = { [StorageType.STREAM_PLAY]: {} };
          fn1(draft1);
          expect(draft1).to.eql({ [StorageType.STREAM_PLAY]: { action: StreamAction.END } });
        });
      });

      it('IntentName.Cancel', () => {
        const utils = {};
        const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: { name: VoiceflowConstants.IntentName.CANCEL }, entities: [] } };
        const runtime = {
          getRequest: sinon.stub().returns(request),
          storage: { get: sinon.stub().returns({}), produce: sinon.stub() },
          end: sinon.stub(),
        };
        const variables = { var1: 'val1' };
        const handler = StreamStateHandler(utils as any);

        expect(handler.handle(null as any, runtime as any, variables as any, null as any)).to.eql(null);
        expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
        expect(runtime.getRequest.callCount).to.eql(1);

        expect(runtime.storage.produce.callCount).to.eql(1);
        const fn1 = runtime.storage.produce.args[0][0];
        const draft1 = { [StorageType.STREAM_PLAY]: {} };
        fn1(draft1);
        expect(draft1).to.eql({ [StorageType.STREAM_PLAY]: { action: StreamAction.PAUSE } });

        expect(runtime.end.callCount).to.eql(1);
      });
    });
  });
});
