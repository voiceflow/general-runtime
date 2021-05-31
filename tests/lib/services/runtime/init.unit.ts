import { TraceType } from '@voiceflow/general-types';
import { SpeakType } from '@voiceflow/general-types/build/nodes/speak';
import { expect } from 'chai';
import sinon from 'sinon';

import init from '@/lib/services/runtime/init';
import { FrameType, StorageType } from '@/lib/services/runtime/types';
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
            type: TraceType.FLOW,
            payload: { diagramID: undefined },
          },
        ],
      ]);
    });

    it('with top frame', () => {
      const client = { setEvent: sinon.stub() };
      const programID = 'program-id';
      const topFrame = { getProgramID: sinon.stub().returns(programID) };
      const runtime = { stack: { top: sinon.stub().returns(topFrame) }, trace: { addTrace: sinon.stub() } };
      init(client as any);

      expect(client.setEvent.args[0][0]).to.eql(EventType.stackDidChange);

      const fn = client.setEvent.args[0][1];
      fn({ runtime });

      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: TraceType.FLOW,
            payload: { diagramID: programID },
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
        expect(topFrame.storage.get.args).to.eql([[FrameType.CALLED_COMMAND], [FrameType.SPEAK]]);
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
        expect(topFrame.storage.get.args).to.eql([[FrameType.CALLED_COMMAND], [FrameType.SPEAK]]);
        expect(topFrame.storage.delete.args).to.eql([[FrameType.CALLED_COMMAND]]);

        const fn2 = runtime.storage.produce.args[0][0];
        const prevOutput = 'abc ';
        const draft = { [StorageType.OUTPUT]: prevOutput };
        fn2(draft);
        expect(draft).to.eql({ [StorageType.OUTPUT]: `${prevOutput}${output}` });

        expect(runtime.trace.addTrace.args).to.eql([[{ type: TraceType.SPEAK, payload: { message: output, type: SpeakType.MESSAGE } }]]);
      });
    });
  });
});
