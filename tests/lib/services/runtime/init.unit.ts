import { BaseNode } from '@voiceflow/base-types';
import { expect } from 'chai';
import sinon from 'sinon';

import init from '@/lib/services/runtime/init';
import { FrameType, StorageType, StreamAction } from '@/lib/services/runtime/types';
import { EventType } from '@/runtime';
import DebugLogging from '@/runtime/lib/Runtime/DebugLogging';
import { getISO8601Timestamp } from '@/runtime/lib/Runtime/DebugLogging/utils';

describe('runtime init service unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('EventType.stackDidChange', () => {
    it('no top frame', () => {
      const client = { setEvent: sinon.stub() };
      const runtime = {
        getVersionID: sinon.stub().returns('versionID'),
        stack: { top: sinon.stub().returns(null) },
        trace: { addTrace: sinon.stub() },
      };
      init(client as any);

      expect(client.setEvent.args[0][0]).to.eql(EventType.stackDidChange);

      const fn = client.setEvent.args[0][1];
      fn({ runtime });

      expect(runtime.trace.addTrace.callCount).to.eql(0);
    });

    it('with top frame', () => {
      const client = { setEvent: sinon.stub() };
      const programID = 'program-id';
      const name = 'flow-name';
      const topFrame = { getProgramID: sinon.stub().returns(programID), getName: sinon.stub().returns(name) };
      const runtime = {
        getVersionID: sinon.stub().returns('versionID'),
        stack: { top: sinon.stub().returns(topFrame) },
        trace: { addTrace: sinon.stub() },
      };
      init(client as any);

      expect(client.setEvent.args[0][0]).to.eql(EventType.stackDidChange);

      const fn = client.setEvent.args[0][1];
      fn({ runtime });

      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: BaseNode.Utils.TraceType.FLOW,
            payload: { diagramID: programID, name },
          },
        ],
      ]);
    });

    it('base frame', () => {
      const client = { setEvent: sinon.stub() };
      const programID = 'program-id';
      const topFrame = { getProgramID: sinon.stub().returns(programID) };
      const runtime = {
        getVersionID: sinon.stub().returns(programID),
        stack: { top: sinon.stub().returns(topFrame) },
        trace: { addTrace: sinon.stub() },
      };
      init(client as any);

      expect(client.setEvent.args[0][0]).to.eql(EventType.stackDidChange);

      const fn = client.setEvent.args[0][1];
      fn({ runtime });

      expect(runtime.trace.addTrace.callCount).to.eql(0);
    });
  });

  describe('EventType.frameDidFinish', () => {
    it('no top frame', () => {
      const client = { setEvent: sinon.stub() };
      const runtime = { stack: { top: sinon.stub().returns(null) } };
      init(client as any);

      expect(client.setEvent.args[1][0]).to.eql(EventType.frameDidFinish);

      const fn = client.setEvent.args[1][1];
      fn({ runtime });

      expect(runtime.stack.top.callCount).to.eql(1);
    });

    describe('with top frame', () => {
      it('no output', () => {
        const client = { setEvent: sinon.stub() };
        const topFrame = {
          storage: {
            get: sinon.stub().onFirstCall().returns('called-command').returns(null),
            delete: sinon.stub(),
          },
        };
        const runtime = { stack: { top: sinon.stub().returns(topFrame) } };
        init(client as any);

        expect(client.setEvent.args[1][0]).to.eql(EventType.frameDidFinish);

        const fn = client.setEvent.args[1][1];
        fn({ runtime });

        expect(runtime.stack.top.callCount).to.eql(3);
        expect(topFrame.storage.get.args).to.eql([[FrameType.CALLED_COMMAND], [FrameType.OUTPUT]]);
        expect(topFrame.storage.delete.args).to.eql([[FrameType.CALLED_COMMAND]]);
      });

      it('with output', () => {
        const client = { setEvent: sinon.stub() };
        const output = 'output';
        const topFrame = {
          storage: {
            get: sinon.stub().onFirstCall().returns('called-command').onSecondCall().returns(output),
            delete: sinon.stub(),
          },
        };
        const runtime = {
          stack: { top: sinon.stub().returns(topFrame) },
          storage: { produce: sinon.stub() },
          trace: { addTrace: sinon.stub() },
          debugLogging: null as unknown as DebugLogging,
        };
        runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
        init(client as any);

        expect(client.setEvent.args[1][0]).to.eql(EventType.frameDidFinish);

        const fn = client.setEvent.args[1][1];
        fn({ runtime });

        expect(runtime.stack.top.callCount).to.eql(3);
        expect(topFrame.storage.get.args).to.eql([[FrameType.CALLED_COMMAND], [FrameType.OUTPUT]]);
        expect(topFrame.storage.delete.args).to.eql([[FrameType.CALLED_COMMAND]]);

        expect(runtime.trace.addTrace.args).to.eql([
          [
            {
              type: BaseNode.Utils.TraceType.SPEAK,
              payload: { message: output, type: BaseNode.Speak.TraceSpeakType.MESSAGE },
            },
          ],
          [
            {
              type: 'log',
              payload: {
                kind: 'step.speak',
                level: 'info',
                message: {
                  componentName: null,
                  stepID: null,
                  text: 'output',
                },
                timestamp: getISO8601Timestamp(),
              },
            },
          ],
        ]);
      });
    });
  });

  describe('EventType.handlerWillHandle', () => {
    it('works', () => {
      const client = { setEvent: sinon.stub() };
      const runtime = { trace: { addTrace: sinon.stub().returns(null) } };
      const node = { id: 'node-id' };
      init(client as any);

      expect(client.setEvent.args[2][0]).to.eql(EventType.handlerWillHandle);

      const fn = client.setEvent.args[2][1];
      fn({ runtime, node });

      expect(runtime.trace.addTrace.args).to.eql([
        [{ type: BaseNode.Utils.TraceType.BLOCK, payload: { blockID: 'node-id' } }],
      ]);
    });
  });

  describe('EventType.updateDidExecute', () => {
    describe('falsy stream', () => {
      it('works with empty stack and turn not end', () => {
        const client = { setEvent: sinon.stub() };
        const stream = undefined;
        const runtime = {
          stack: { isEmpty: sinon.stub().returns(true) },
          storage: { get: sinon.stub().returns(stream) },
          trace: { addTrace: sinon.stub() },
          turn: { get: sinon.stub().returns(false) },
        };
        init(client as any);

        expect(client.setEvent.args[3][0]).to.eql(EventType.updateDidExecute);

        const fn = client.setEvent.args[3][1];
        fn({ runtime });

        expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
        expect(runtime.trace.addTrace.args).to.eql([[{ type: BaseNode.Utils.TraceType.END, payload: undefined }]]);
      });

      it('works with empty stack and turn is end', () => {
        const client = { setEvent: sinon.stub() };
        const stream = undefined;
        const runtime = {
          stack: { isEmpty: sinon.stub().returns(true) },
          storage: { get: sinon.stub().returns(stream) },
          trace: { addTrace: sinon.stub() },
          turn: { get: sinon.stub().returns(true) },
        };
        init(client as any);

        expect(client.setEvent.args[3][0]).to.eql(EventType.updateDidExecute);

        const fn = client.setEvent.args[3][1];
        fn({ runtime });

        expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
        expect(runtime.trace.addTrace.callCount).to.eql(0);
      });

      it('works with non-empty stack and turn is end', () => {
        const client = { setEvent: sinon.stub() };
        const stream = undefined;
        const runtime = {
          stack: { isEmpty: sinon.stub().returns(false) },
          storage: { get: sinon.stub().returns(stream) },
          trace: { addTrace: sinon.stub() },
          turn: { get: sinon.stub().returns(true) },
        };
        init(client as any);

        expect(client.setEvent.args[3][0]).to.eql(EventType.updateDidExecute);

        const fn = client.setEvent.args[3][1];
        fn({ runtime });

        expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
        expect(runtime.trace.addTrace.callCount).to.eql(0);
      });
    });

    describe('defined stream', () => {
      describe('START action', () => {
        it('works with truthy loop', () => {
          const client = { setEvent: sinon.stub() };
          const stream = {
            action: StreamAction.START,
            src: 'src-val',
            token: 'token-val',
            loop: true,
            backgroundImage: 'background-image-val',
            description: 'description-val',
            iconImage: 'icon-image-val',
            title: 'title-val',
          };
          const runtime = {
            stack: { isEmpty: sinon.stub().returns(true) },
            storage: { get: sinon.stub().returns(stream) },
            trace: { addTrace: sinon.stub() },
            turn: { get: sinon.stub().returns(false) },
          };
          init(client as any);

          expect(client.setEvent.args[3][0]).to.eql(EventType.updateDidExecute);

          const fn = client.setEvent.args[3][1];
          fn({ runtime });

          expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
          expect(runtime.trace.addTrace.args).to.eql([
            [
              {
                type: BaseNode.Utils.TraceType.STREAM,
                payload: {
                  src: stream.src,
                  token: stream.token,
                  action: BaseNode.Stream.TraceStreamAction.LOOP,
                  loop: true,
                  backgroundImage: stream.backgroundImage,
                  description: stream.description,
                  iconImage: stream.iconImage,
                  title: stream.title,
                },
              },
            ],
            [{ type: BaseNode.Utils.TraceType.END, payload: undefined }],
          ]);
        });

        it('works with falsy loop value', () => {
          const client = { setEvent: sinon.stub() };
          const stream = {
            action: StreamAction.START,
            src: 'src-val',
            token: 'token-val',
            loop: false,
            backgroundImage: 'background-image-val',
            description: 'description-val',
            iconImage: 'icon-image-val',
            title: 'title-val',
          };
          const runtime = {
            stack: { isEmpty: sinon.stub().returns(true) },
            storage: { get: sinon.stub().returns(stream) },
            trace: { addTrace: sinon.stub() },
            turn: { get: sinon.stub().returns(false) },
          };
          init(client as any);

          expect(client.setEvent.args[3][0]).to.eql(EventType.updateDidExecute);

          const fn = client.setEvent.args[3][1];
          fn({ runtime });

          expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
          expect(runtime.trace.addTrace.args).to.eql([
            [
              {
                type: BaseNode.Utils.TraceType.STREAM,
                payload: {
                  src: stream.src,
                  token: stream.token,
                  action: BaseNode.Stream.TraceStreamAction.PLAY,
                  loop: false,
                  backgroundImage: stream.backgroundImage,
                  description: stream.description,
                  iconImage: stream.iconImage,
                  title: stream.title,
                },
              },
            ],
            [{ type: BaseNode.Utils.TraceType.END, payload: undefined }],
          ]);
        });
      });
      describe('RESUME action', () => {
        it('works with truthy loop', () => {
          const client = { setEvent: sinon.stub() };
          const stream = {
            action: StreamAction.RESUME,
            src: 'src-val',
            token: 'token-val',
            loop: true,
            backgroundImage: 'background-image-val',
            description: 'description-val',
            iconImage: 'icon-image-val',
            title: 'title-val',
          };
          const runtime = {
            stack: { isEmpty: sinon.stub().returns(true) },
            storage: { get: sinon.stub().returns(stream) },
            trace: { addTrace: sinon.stub() },
            turn: { get: sinon.stub().returns(false) },
          };
          init(client as any);

          expect(client.setEvent.args[3][0]).to.eql(EventType.updateDidExecute);

          const fn = client.setEvent.args[3][1];
          fn({ runtime });

          expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
          expect(runtime.trace.addTrace.args).to.eql([
            [
              {
                type: BaseNode.Utils.TraceType.STREAM,
                payload: {
                  src: stream.src,
                  token: stream.token,
                  action: BaseNode.Stream.TraceStreamAction.LOOP,
                  loop: true,
                  backgroundImage: stream.backgroundImage,
                  description: stream.description,
                  iconImage: stream.iconImage,
                  title: stream.title,
                },
              },
            ],
            [{ type: BaseNode.Utils.TraceType.END, payload: undefined }],
          ]);
        });

        it('works with falsy loop value', () => {
          const client = { setEvent: sinon.stub() };
          const stream = {
            action: StreamAction.RESUME,
            src: 'src-val',
            token: 'token-val',
            loop: false,
            backgroundImage: 'background-image-val',
            description: 'description-val',
            iconImage: 'icon-image-val',
            title: 'title-val',
          };
          const runtime = {
            stack: { isEmpty: sinon.stub().returns(false) },
            storage: { get: sinon.stub().returns(stream) },
            trace: { addTrace: sinon.stub() },
            turn: { get: sinon.stub().returns(false) },
          };
          init(client as any);

          expect(client.setEvent.args[3][0]).to.eql(EventType.updateDidExecute);

          const fn = client.setEvent.args[3][1];
          fn({ runtime });

          expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
          expect(runtime.trace.addTrace.args).to.eql([
            [
              {
                type: BaseNode.Utils.TraceType.STREAM,
                payload: {
                  src: stream.src,
                  token: stream.token,
                  action: BaseNode.Stream.TraceStreamAction.PLAY,
                  loop: false,
                  backgroundImage: stream.backgroundImage,
                  description: stream.description,
                  iconImage: stream.iconImage,
                  title: stream.title,
                },
              },
            ],
          ]);
        });
      });
      describe('PAUSE action', () => {
        it('works', () => {
          const client = { setEvent: sinon.stub() };
          const stream = {
            action: StreamAction.PAUSE,
            src: 'src-val',
            token: 'token-val',
            loop: true,
            backgroundImage: 'background-image-val',
            description: 'description-val',
            iconImage: 'icon-image-val',
            title: 'title-val',
          };
          const runtime = {
            stack: { isEmpty: sinon.stub().returns(false) },
            storage: { get: sinon.stub().returns(stream) },
            trace: { addTrace: sinon.stub() },
            turn: { get: sinon.stub().returns(false) },
          };
          init(client as any);

          expect(client.setEvent.args[3][0]).to.eql(EventType.updateDidExecute);

          const fn = client.setEvent.args[3][1];
          fn({ runtime });

          expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
          expect(runtime.trace.addTrace.args).to.eql([
            [
              {
                type: BaseNode.Utils.TraceType.STREAM,
                payload: {
                  src: stream.src,
                  token: stream.token,
                  action: BaseNode.Stream.TraceStreamAction.PAUSE,
                  loop: true,
                  backgroundImage: stream.backgroundImage,
                  description: stream.description,
                  iconImage: stream.iconImage,
                  title: stream.title,
                },
              },
            ],
          ]);
        });
      });
      describe('default action', () => {
        it('works with at end', () => {
          const client = { setEvent: sinon.stub() };
          const stream = { action: 'someaction', src: 'src-val', token: 'token-val', loop: true };
          const runtime = {
            stack: { isEmpty: sinon.stub().returns(true) },
            storage: { get: sinon.stub().returns(stream) },
            trace: { addTrace: sinon.stub() },
            turn: { get: sinon.stub().returns(false) },
          };
          init(client as any);

          expect(client.setEvent.args[3][0]).to.eql(EventType.updateDidExecute);

          const fn = client.setEvent.args[3][1];
          fn({ runtime });

          expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
          expect(runtime.trace.addTrace.args).to.eql([[{ type: BaseNode.Utils.TraceType.END, payload: undefined }]]);
        });

        it('works with not at end', () => {
          const client = { setEvent: sinon.stub() };
          const stream = { action: 'someaction', src: 'src-val', token: 'token-val', loop: true };
          const runtime = {
            stack: { isEmpty: sinon.stub().returns(false) },
            storage: { get: sinon.stub().returns(stream) },
            trace: { addTrace: sinon.stub() },
            turn: { get: sinon.stub().returns(false) },
          };
          init(client as any);

          expect(client.setEvent.args[3][0]).to.eql(EventType.updateDidExecute);

          const fn = client.setEvent.args[3][1];
          fn({ runtime });

          expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PLAY]]);
          expect(runtime.trace.addTrace.args).to.eql([]);
        });
      });
    });
  });
});
