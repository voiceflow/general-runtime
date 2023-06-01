import { AlexaConstants } from '@voiceflow/alexa-types';
import { BaseNode, BaseRequest } from '@voiceflow/base-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { StreamStateHandler } from '@/lib/services/runtime/handlers/state/stream';
import { StorageType, StreamAction } from '@/lib/services/runtime/types';

describe('stream state handler unit tests', () => {
  describe('canHandle', () => {
    describe('false', () => {
      it('no stream play', () => {
        const runtime = {
          getRequest: sinon.stub().returns({}),
          storage: { get: sinon.stub().returns(null) },
        };
        expect(StreamStateHandler(null as any).canHandle(null as any, runtime as any, null as any, null as any)).to.eql(
          false
        );
        expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
      });

      it('end action', () => {
        const runtime = {
          getRequest: sinon.stub().returns({}),
          storage: { get: sinon.stub().returns({ action: StreamAction.END }) },
        };
        expect(StreamStateHandler(null as any).canHandle(null as any, runtime as any, null as any, null as any)).to.eql(
          false
        );
        expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY], [StorageType.STREAM_PLAY]]);
      });

      it('alexa intent request', () => {
        const alexaEventIntentRequest = {
          type: BaseRequest.RequestType.INTENT,
          payload: { intent: { name: VoiceflowConstants.IntentName.PAUSE }, entities: [], data: {} },
        };

        const runtime = {
          getRequest: sinon.stub().returns(alexaEventIntentRequest),
          storage: { get: sinon.stub().returns({ action: StreamAction.PAUSE }) },
        };
        expect(StreamStateHandler(null as any).canHandle(null as any, runtime as any, null as any, null as any)).to.eql(
          false
        );
        expect(runtime.storage.get.callCount).to.eql(0);
      });
    });

    it('true', () => {
      const runtime = {
        getRequest: sinon.stub().returns({}),
        storage: { get: sinon.stub().returns({ action: 'play' }) },
      };
      expect(StreamStateHandler(null as any).canHandle(null as any, runtime as any, null as any, null as any)).to.eql(
        true
      );
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
          storage: { get: sinon.stub().returns({}), set: sinon.stub() },
          trace: { addTrace: sinon.stub() },
        };
        const variables = { var1: 'val1' };
        const handler = StreamStateHandler(utils as any);

        expect(handler.handle(null as any, runtime as any, variables as any, null as any)).to.eql(output);
        expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
        expect(runtime.getRequest.callCount).to.eql(1);
        expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);

        expect(runtime.storage.set.callCount).to.eql(1);
        expect(runtime.storage.set.args[0][0]).to.eql(StorageType.STREAM_PLAY);
        expect(runtime.storage.set.args[0][1]).to.contain({ action: StreamAction.END });
        expect(runtime.trace.addTrace.args[0][0]).to.eql({
          type: BaseNode.Utils.TraceType.STREAM,
          payload: {
            src: undefined,
            token: undefined,
            action: BaseNode.Stream.TraceStreamAction.END,
            loop: undefined,
            description: undefined,
            title: undefined,
            iconImage: undefined,
            backgroundImage: undefined,
          },
        });

        expect(utils.commandHandler.handle.args).to.eql([[runtime, variables]]);
      });

      it('else', () => {
        const utils = {
          commandHandler: { canHandle: sinon.stub().returns(false) },
        };
        const runtime = {
          getRequest: sinon.stub().returns(null),
          storage: { get: sinon.stub().returns({}), set: sinon.stub() },
          trace: { addTrace: sinon.stub() },
          end: sinon.stub(),
        };
        const handler = StreamStateHandler(utils as any);

        expect(handler.handle(null as any, runtime as any, null as any, null as any)).to.eql(null);
        expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
        expect(runtime.getRequest.callCount).to.eql(1);

        expect(runtime.storage.set.callCount).to.eql(1);
        expect(runtime.storage.set.args[0][0]).to.eql(StorageType.STREAM_PLAY);
        expect(runtime.storage.set.args[0][1]).to.contain({ action: StreamAction.NOEFFECT });
        expect(runtime.trace.addTrace.callCount).to.eql(0);
        expect(runtime.end.callCount).to.eql(1);
      });
    });

    describe('with intent request', () => {
      describe('IntentName.PAUSE', () => {
        it('with pauseID', () => {
          const utils = {};
          const request = {
            type: BaseRequest.RequestType.INTENT,
            payload: { intent: { name: VoiceflowConstants.IntentName.PAUSE }, entities: [] },
          };
          const streamPlay = { pauseID: 'pause-id', nodeID: 'node-id', offset: 100 };
          const runtime = {
            getRequest: sinon.stub().returns(request),
            storage: { get: sinon.stub().returns(streamPlay), set: sinon.stub() },
            trace: { addTrace: sinon.stub() },
          };
          const variables = { var1: 'val1' };
          const handler = StreamStateHandler(utils as any);

          expect(handler.handle(null as any, runtime as any, variables as any, null as any)).to.eql(streamPlay.pauseID);
          expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
          expect(runtime.getRequest.callCount).to.eql(1);
          expect(runtime.storage.set.args[0]).to.eql([
            StorageType.STREAM_PAUSE,
            { id: streamPlay.nodeID, offset: streamPlay.offset },
          ]);

          expect(runtime.storage.set.callCount).to.eql(2);
          expect(runtime.storage.set.args[1][0]).to.eql(StorageType.STREAM_PLAY);
          expect(runtime.storage.set.args[1][1]).to.contain({ action: StreamAction.END });
          expect(runtime.trace.addTrace.args[0][0]).to.eql({
            type: BaseNode.Utils.TraceType.STREAM,
            payload: {
              src: undefined,
              token: undefined,
              action: BaseNode.Stream.TraceStreamAction.END,
              loop: undefined,
              description: undefined,
              title: undefined,
              iconImage: undefined,
              backgroundImage: undefined,
            },
          });
        });

        it('no pauseID', () => {
          const utils = {};
          const request = {
            type: BaseRequest.RequestType.INTENT,
            payload: { intent: { name: VoiceflowConstants.IntentName.PAUSE }, entities: [] },
          };
          const runtime = {
            getRequest: sinon.stub().returns(request),
            storage: { get: sinon.stub().returns({}), set: sinon.stub() },
            trace: { addTrace: sinon.stub() },
            end: sinon.stub(),
          };
          const variables = { var1: 'val1' };
          const handler = StreamStateHandler(utils as any);

          expect(handler.handle(null as any, runtime as any, variables as any, null as any)).to.eql(null);
          expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
          expect(runtime.getRequest.callCount).to.eql(1);

          expect(runtime.storage.set.callCount).to.eql(1);
          expect(runtime.storage.set.args[0][0]).to.eql(StorageType.STREAM_PLAY);
          expect(runtime.storage.set.args[0][1]).to.contain({ action: StreamAction.PAUSE });
          expect(runtime.trace.addTrace.args[0][0]).to.eql({
            type: BaseNode.Utils.TraceType.STREAM,
            payload: {
              src: undefined,
              token: undefined,
              action: BaseNode.Stream.TraceStreamAction.PAUSE,
              loop: undefined,
              description: undefined,
              title: undefined,
              iconImage: undefined,
              backgroundImage: undefined,
            },
          });
          expect(runtime.end.callCount).to.eql(1);
        });
      });

      it('IntentName.RESUME', () => {
        const utils = {};
        const request = {
          type: BaseRequest.RequestType.INTENT,
          payload: { intent: { name: VoiceflowConstants.IntentName.RESUME }, entities: [] },
        };
        const runtime = {
          getRequest: sinon.stub().returns(request),
          storage: { get: sinon.stub().returns({}), set: sinon.stub() },
          trace: { addTrace: sinon.stub() },

          end: sinon.stub(),
        };
        const variables = { var1: 'val1' };
        const handler = StreamStateHandler(utils as any);

        expect(handler.handle(null as any, runtime as any, variables as any, null as any)).to.eql(null);
        expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
        expect(runtime.getRequest.callCount).to.eql(1);

        expect(runtime.storage.set.callCount).to.eql(1);
        expect(runtime.storage.set.args[0][0]).to.eql(StorageType.STREAM_PLAY);
        expect(runtime.storage.set.args[0][1]).to.contain({ action: StreamAction.RESUME });
        expect(runtime.trace.addTrace.args[0][0]).to.eql({
          type: BaseNode.Utils.TraceType.STREAM,
          payload: {
            src: undefined,
            token: undefined,
            action: BaseNode.Stream.TraceStreamAction.PLAY,
            loop: undefined,
            description: undefined,
            title: undefined,
            iconImage: undefined,
            backgroundImage: undefined,
          },
        });

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
          storage: { get: sinon.stub().returns({}), set: sinon.stub() },
          trace: { addTrace: sinon.stub() },
          end: sinon.stub(),
        };
        const variables = { var1: 'val1' };
        const handler = StreamStateHandler(utils as any);

        expect(handler.handle(null as any, runtime as any, variables as any, null as any)).to.eql(null);
        expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
        expect(runtime.getRequest.callCount).to.eql(1);

        expect(runtime.storage.set.callCount).to.eql(1);
        expect(runtime.storage.set.args[0][0]).to.eql(StorageType.STREAM_PLAY);
        expect(runtime.storage.set.args[0][1]).to.contain({ action: StreamAction.START, offset: 0 });
        expect(runtime.trace.addTrace.args[0][0]).to.eql({
          type: BaseNode.Utils.TraceType.STREAM,
          payload: {
            src: undefined,
            token: undefined,
            action: BaseNode.Stream.TraceStreamAction.PLAY,
            loop: undefined,
            description: undefined,
            title: undefined,
            iconImage: undefined,
            backgroundImage: undefined,
          },
        });

        expect(runtime.end.callCount).to.eql(1);
      });

      it('IntentName.REPEAT', () => {
        const utils = {};
        const request = {
          type: BaseRequest.RequestType.INTENT,
          payload: { intent: { name: VoiceflowConstants.IntentName.REPEAT }, entities: [] },
        };
        const runtime = {
          getRequest: sinon.stub().returns(request),
          storage: { get: sinon.stub().returns({}), set: sinon.stub() },
          trace: { addTrace: sinon.stub() },
          end: sinon.stub(),
        };
        const variables = { var1: 'val1' };
        const handler = StreamStateHandler(utils as any);

        expect(handler.handle(null as any, runtime as any, variables as any, null as any)).to.eql(null);
        expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
        expect(runtime.getRequest.callCount).to.eql(1);

        expect(runtime.storage.set.callCount).to.eql(1);
        expect(runtime.storage.set.args[0][0]).to.eql(StorageType.STREAM_PLAY);
        expect(runtime.storage.set.args[0][1]).to.contain({ action: StreamAction.START, offset: 0 });
        expect(runtime.trace.addTrace.args[0][0]).to.eql({
          type: BaseNode.Utils.TraceType.STREAM,
          payload: {
            src: undefined,
            token: undefined,
            action: BaseNode.Stream.TraceStreamAction.PLAY,
            loop: undefined,
            description: undefined,
            title: undefined,
            iconImage: undefined,
            backgroundImage: undefined,
          },
        });

        expect(runtime.end.callCount).to.eql(1);
      });

      describe('NEXT', () => {
        it('intent', () => {
          const nextID = 'next-id';
          const utils = {};
          const request = {
            type: BaseRequest.RequestType.INTENT,
            payload: { intent: { name: VoiceflowConstants.IntentName.NEXT }, entities: [] },
          };
          const runtime = {
            getRequest: sinon.stub().returns(request),
            storage: { get: sinon.stub().returns({ nextID }), set: sinon.stub() },
            trace: { addTrace: sinon.stub() },
          };
          const variables = { var1: 'val1' };
          const handler = StreamStateHandler(utils as any);

          expect(handler.handle(null as any, runtime as any, variables as any, null as any)).to.eql(nextID);
          expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
          expect(runtime.getRequest.callCount).to.eql(1);

          expect(runtime.storage.set.callCount).to.eql(1);
          expect(runtime.storage.set.args[0][0]).to.eql(StorageType.STREAM_PLAY);
          expect(runtime.storage.set.args[0][1]).to.contain({ action: StreamAction.END });
          expect(runtime.trace.addTrace.args[0][0]).to.eql({
            type: BaseNode.Utils.TraceType.STREAM,
            payload: {
              src: undefined,
              token: undefined,
              action: BaseNode.Stream.TraceStreamAction.END,
              loop: undefined,
              description: undefined,
              title: undefined,
              iconImage: undefined,
              backgroundImage: undefined,
            },
          });
        });

        it('streamAction', () => {
          const utils = {};
          const request = {
            type: BaseRequest.RequestType.INTENT,
            payload: { intent: { name: 'random' }, entities: [] },
          };
          const runtime = {
            getRequest: sinon.stub().returns(request),
            storage: { get: sinon.stub().returns({ action: StreamAction.NEXT }), set: sinon.stub() },
            trace: { addTrace: sinon.stub() },
          };
          const variables = { var1: 'val1' };
          const handler = StreamStateHandler(utils as any);

          expect(handler.handle(null as any, runtime as any, variables as any, null as any)).to.eql(null);
          expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
          expect(runtime.getRequest.callCount).to.eql(1);

          expect(runtime.storage.set.callCount).to.eql(1);
          expect(runtime.storage.set.args[0][0]).to.eql(StorageType.STREAM_PLAY);
          expect(runtime.storage.set.args[0][1]).to.contain({ action: StreamAction.END });
          expect(runtime.trace.addTrace.args[0][0]).to.eql({
            type: BaseNode.Utils.TraceType.STREAM,
            payload: {
              src: undefined,
              token: undefined,
              action: BaseNode.Stream.TraceStreamAction.END,
              loop: undefined,
              description: undefined,
              title: undefined,
              iconImage: undefined,
              backgroundImage: undefined,
            },
          });
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
            storage: { get: sinon.stub().returns({}), set: sinon.stub() },
            trace: { addTrace: sinon.stub() },
          };
          const variables = { var1: 'val1' };
          const handler = StreamStateHandler(utils as any);

          expect(handler.handle(null as any, runtime as any, variables as any, null as any)).to.eql(null);
          expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
          expect(runtime.getRequest.callCount).to.eql(1);

          expect(runtime.storage.set.callCount).to.eql(1);
          expect(runtime.storage.set.args[0][0]).to.eql(StorageType.STREAM_PLAY);
          expect(runtime.storage.set.args[0][1]).to.contain({ action: StreamAction.END });
          expect(runtime.trace.addTrace.args[0][0]).to.eql({
            type: BaseNode.Utils.TraceType.STREAM,
            payload: {
              src: undefined,
              token: undefined,
              action: BaseNode.Stream.TraceStreamAction.END,
              loop: undefined,
              description: undefined,
              title: undefined,
              iconImage: undefined,
              backgroundImage: undefined,
            },
          });
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
            storage: { get: sinon.stub().returns({ previousID }), set: sinon.stub() },
            trace: { addTrace: sinon.stub() },
          };
          const variables = { var1: 'val1' };
          const handler = StreamStateHandler(utils as any);

          expect(handler.handle(null as any, runtime as any, variables as any, null as any)).to.eql(previousID);
          expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
          expect(runtime.getRequest.callCount).to.eql(1);

          expect(runtime.storage.set.callCount).to.eql(1);
          expect(runtime.storage.set.args[0][0]).to.eql(StorageType.STREAM_PLAY);
          expect(runtime.storage.set.args[0][1]).to.contain({ action: StreamAction.END });
          expect(runtime.trace.addTrace.args[0][0]).to.eql({
            type: BaseNode.Utils.TraceType.STREAM,
            payload: {
              src: undefined,
              token: undefined,
              action: BaseNode.Stream.TraceStreamAction.END,
              loop: undefined,
              description: undefined,
              title: undefined,
              iconImage: undefined,
              backgroundImage: undefined,
            },
          });
        });
      });

      it('IntentName.Cancel', () => {
        const utils = {};
        const request = {
          type: BaseRequest.RequestType.INTENT,
          payload: { intent: { name: VoiceflowConstants.IntentName.CANCEL }, entities: [] },
        };
        const runtime = {
          getRequest: sinon.stub().returns(request),
          storage: { get: sinon.stub().returns({}), set: sinon.stub() },
          trace: { addTrace: sinon.stub() },
          end: sinon.stub(),
        };
        const variables = { var1: 'val1' };
        const handler = StreamStateHandler(utils as any);

        expect(handler.handle(null as any, runtime as any, variables as any, null as any)).to.eql(null);
        expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
        expect(runtime.getRequest.callCount).to.eql(1);

        expect(runtime.storage.set.callCount).to.eql(1);
        expect(runtime.storage.set.args[0][0]).to.eql(StorageType.STREAM_PLAY);
        expect(runtime.storage.set.args[0][1]).to.contain({ action: StreamAction.PAUSE });
        expect(runtime.trace.addTrace.args[0][0]).to.eql({
          type: BaseNode.Utils.TraceType.STREAM,
          payload: {
            src: undefined,
            token: undefined,
            action: BaseNode.Stream.TraceStreamAction.PAUSE,
            loop: undefined,
            description: undefined,
            title: undefined,
            iconImage: undefined,
            backgroundImage: undefined,
          },
        });

        expect(runtime.end.callCount).to.eql(1);
      });

      // eslint-disable-next-line no-secrets/no-secrets
      describe('IntentName.PLAYBACK_NEARLY_FINISHED', () => {
        it('with loop', () => {
          const utils = {};
          const request = {
            type: BaseRequest.RequestType.INTENT,
            payload: { intent: { name: AlexaConstants.AmazonIntent.PLAYBACK_NEARLY_FINISHED }, entities: [] },
          };
          const runtime = {
            getRequest: sinon.stub().returns(request),
            storage: { get: sinon.stub().returns({ loop: true }), set: sinon.stub() },
            trace: { addTrace: sinon.stub() },
            end: sinon.stub(),
          };
          const variables = { var1: 'val1' };
          const handler = StreamStateHandler(utils as any);

          expect(handler.handle(null as any, runtime as any, variables as any, null as any)).to.eql(null);
          expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
          expect(runtime.getRequest.callCount).to.eql(1);

          expect(runtime.storage.set.callCount).to.eql(1);
          expect(runtime.storage.set.args[0][0]).to.eql(StorageType.STREAM_PLAY);
          expect(runtime.storage.set.args[0][1]).to.contain({ action: StreamAction.LOOP });
          expect(runtime.trace.addTrace.args[0][0]).to.eql({
            type: BaseNode.Utils.TraceType.STREAM,
            payload: {
              src: undefined,
              token: undefined,
              action: BaseNode.Stream.TraceStreamAction.LOOP,
              loop: true,
              description: undefined,
              title: undefined,
              iconImage: undefined,
              backgroundImage: undefined,
            },
          });

          expect(runtime.end.callCount).to.eql(1);
        });

        it('without loop AND no nextID', () => {
          const utils = {};
          const request = {
            type: BaseRequest.RequestType.INTENT,
            payload: { intent: { name: AlexaConstants.AmazonIntent.PLAYBACK_NEARLY_FINISHED }, entities: [] },
          };
          const runtime = {
            getRequest: sinon.stub().returns(request),
            storage: { get: sinon.stub().returns({}), set: sinon.stub() },
            trace: { addTrace: sinon.stub() },
          };
          const variables = { var1: 'val1' };
          const handler = StreamStateHandler(utils as any);

          expect(handler.handle(null as any, runtime as any, variables as any, null as any)).to.eql(null);
          expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
          expect(runtime.getRequest.callCount).to.eql(1);

          expect(runtime.storage.set.callCount).to.eql(1);
          expect(runtime.storage.set.args[0][0]).to.eql(StorageType.STREAM_PLAY);
          expect(runtime.storage.set.args[0][1]).to.contain({ action: StreamAction.END });
          expect(runtime.trace.addTrace.args[0][0]).to.eql({
            type: BaseNode.Utils.TraceType.STREAM,
            payload: {
              src: undefined,
              token: undefined,
              action: BaseNode.Stream.TraceStreamAction.END,
              loop: undefined,
              description: undefined,
              title: undefined,
              iconImage: undefined,
              backgroundImage: undefined,
            },
          });
        });

        it('without loop AND nextID', () => {
          const utils = {};
          const request = {
            type: BaseRequest.RequestType.INTENT,
            payload: { intent: { name: AlexaConstants.AmazonIntent.PLAYBACK_NEARLY_FINISHED }, entities: [] },
          };
          const nextID = 'next-id';
          const runtime = {
            getRequest: sinon.stub().returns(request),
            storage: { get: sinon.stub().returns({ nextID }), set: sinon.stub() },
            trace: { addTrace: sinon.stub() },
          };
          const variables = { var1: 'val1' };
          const handler = StreamStateHandler(utils as any);

          expect(handler.handle(null as any, runtime as any, variables as any, null as any)).to.eql(nextID);
          expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
          expect(runtime.getRequest.callCount).to.eql(1);

          expect(runtime.storage.set.callCount).to.eql(1);
          expect(runtime.storage.set.args[0][0]).to.eql(StorageType.STREAM_PLAY);
          expect(runtime.storage.set.args[0][1]).to.contain({ action: StreamAction.END });
          expect(runtime.trace.addTrace.args[0][0]).to.eql({
            type: BaseNode.Utils.TraceType.STREAM,
            payload: {
              src: undefined,
              token: undefined,
              action: BaseNode.Stream.TraceStreamAction.END,
              loop: undefined,
              description: undefined,
              title: undefined,
              iconImage: undefined,
              backgroundImage: undefined,
            },
          });
        });
      });
    });
  });
});
