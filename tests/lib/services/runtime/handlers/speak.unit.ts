import { expect } from 'chai';
import sinon from 'sinon';

import SpeakHandler from '@/lib/services/runtime/handlers/speak';
import { FrameType } from '@/lib/services/runtime/types';

describe('speak handler unit tests', async () => {
  const speakHandler = SpeakHandler();

  afterEach(() => sinon.restore());

  describe('canHandle', () => {
    it('false', async () => {
      expect(speakHandler.canHandle({} as any, null as any, null as any, null as any)).to.eql(false);
      expect(speakHandler.canHandle({ prompt: 'true' } as any, null as any, null as any, null as any)).to.eql(false);
      expect(speakHandler.canHandle({ prompt: 1 } as any, null as any, null as any, null as any)).to.eql(false);
    });

    it('true', async () => {
      expect(speakHandler.canHandle({ random_speak: ['a', 'b', 'c'] } as any, null as any, null as any, null as any)).to.eql(true);
      expect(speakHandler.canHandle({ prompt: 'false' } as any, null as any, null as any, null as any)).to.eql(true);
      expect(speakHandler.canHandle({ speak: 'hi' } as any, null as any, null as any, null as any)).to.eql(true);
    });
  });

  describe('handle', () => {
    it('random speak', () => {
      const node = {
        nextId: 'next-id',
        random_speak: ['one', 'two', 'three'],
      };

      const topFrame = {
        storage: { set: sinon.stub() },
      };
      const runtime = {
        trace: { addTrace: sinon.stub() },
        storage: { produce: sinon.stub() },
        stack: { top: sinon.stub().returns(topFrame) },
      };
      const variables = { getState: sinon.stub().returns({}) };

      expect(speakHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.nextId);
      expect(topFrame.storage.set.args[0][0]).to.eql(FrameType.OUTPUT);
      // output is one of the options in random_speak
      expect(node.random_speak.includes(topFrame.storage.set.args[0][1])).to.eql(true);
    });

    it('speak', () => {
      const node = {
        speak: 'random {var} or {var1}',
      };

      const topFrame = {
        storage: { set: sinon.stub() },
      };
      const runtime = {
        trace: { addTrace: sinon.stub() },
        storage: { produce: sinon.stub() },
        stack: { top: sinon.stub().returns(topFrame) },
      };
      const varState = { var: 1.234, var1: 'here' };
      const variables = { getState: sinon.stub().returns(varState) };

      expect(speakHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
      // output has vars replaced and numbers turned to 2digits floats
      expect(topFrame.storage.set.args).to.eql([[FrameType.OUTPUT, 'random 1.23 or here']]);
      expect(runtime.trace.addTrace.args).to.eql([[{ type: 'speak', payload: { message: 'random 1.23 or here', type: 'message' } }]]);
    });

    it('speak is not string', () => {
      const node = {
        speak: 1,
      };

      const runtime = {
        storage: { produce: sinon.stub() },
      };
      const variables = { getState: sinon.stub().returns({}) };

      expect(speakHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
      expect(runtime.storage.produce.callCount).to.eql(0);
    });
  });
});
