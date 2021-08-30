import { Node } from '@voiceflow/base-types';
import { expect } from 'chai';
import sinon from 'sinon';

import init from '@/lib/services/runtime/init';
import { FrameType } from '@/lib/services/runtime/types';
import { EventType } from '@/runtime';

describe('runtime init service unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('EventType.stackDidChange', () => {
    it('no top frame', () => {
      const client = { setEvent: sinon.stub() };
      const runtime = { stack: { top: sinon.stub().returns(null) }, trace: { addTrace: sinon.stub() } };
      init(client as any);

      expect(client.setEvent.args[0][0]).to.eql(EventType.stackDidChange);

      const fn = client.setEvent.args[0][1];
      fn({ runtime });

      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: Node.Utils.TraceType.FLOW,
            payload: { diagramID: undefined, name: undefined },
          },
        ],
      ]);
    });

    it('with top frame', () => {
      const client = { setEvent: sinon.stub() };
      const programID = 'program-id';
      const name = 'flow-name';
      const topFrame = { getProgramID: sinon.stub().returns(programID), getName: sinon.stub().returns(name) };
      const runtime = { stack: { top: sinon.stub().returns(topFrame) }, trace: { addTrace: sinon.stub() } };
      init(client as any);

      expect(client.setEvent.args[0][0]).to.eql(EventType.stackDidChange);

      const fn = client.setEvent.args[0][1];
      fn({ runtime });

      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: Node.Utils.TraceType.FLOW,
            payload: { diagramID: programID, name },
          },
        ],
      ]);
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
            get: sinon
              .stub()
              .onFirstCall()
              .returns('called-command')
              .returns(null),
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
            get: sinon
              .stub()
              .onFirstCall()
              .returns('called-command')
              .onSecondCall()
              .returns(output),
            delete: sinon.stub(),
          },
        };
        const runtime = { stack: { top: sinon.stub().returns(topFrame) }, storage: { produce: sinon.stub() }, trace: { addTrace: sinon.stub() } };
        init(client as any);

        expect(client.setEvent.args[1][0]).to.eql(EventType.frameDidFinish);

        const fn = client.setEvent.args[1][1];
        fn({ runtime });

        expect(runtime.stack.top.callCount).to.eql(3);
        expect(topFrame.storage.get.args).to.eql([[FrameType.CALLED_COMMAND], [FrameType.OUTPUT]]);
        expect(topFrame.storage.delete.args).to.eql([[FrameType.CALLED_COMMAND]]);

        expect(runtime.trace.addTrace.args).to.eql([
          [{ type: Node.Utils.TraceType.SPEAK, payload: { message: output, type: Node.Speak.TraceSpeakType.MESSAGE } }],
        ]);
      });
    });
  });
});
