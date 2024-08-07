import { BaseNode } from '@voiceflow/base-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { SpeakHandler } from '@/lib/services/runtime/handlers/speak';
import { FrameType } from '@/lib/services/runtime/types';
import { addOutputTrace, speakOutputTrace } from '@/lib/services/runtime/utils';
import DebugLogging from '@/runtime/lib/Runtime/DebugLogging';
import { getISO8601Timestamp } from '@/runtime/lib/Runtime/DebugLogging/utils';

import { mockTime } from '../../dialog/fixture';

describe('speak handler unit tests', async () => {
  const speakHandler = SpeakHandler({
    _sample: sinon.stub().callsFake((arr: any[]) => arr[0]),
    addOutputTrace,
    speakOutputTrace,
  });

  beforeEach(() => sinon.useFakeTimers(mockTime));

  afterEach(() => sinon.restore());

  describe('canHandle', () => {
    it('false', async () => {
      expect(speakHandler.canHandle({} as any, null as any, null as any, null as any)).to.eql(false);
      expect(speakHandler.canHandle({ speak: 'hello' } as any, null as any, null as any, null as any)).to.eql(true);
    });

    it('true', async () => {
      expect(
        speakHandler.canHandle({ random_speak: ['a', 'b', 'c'] } as any, null as any, null as any, null as any)
      ).to.eql(true);
      expect(speakHandler.canHandle({ speak: 'hi' } as any, null as any, null as any, null as any)).to.eql(true);
    });
  });

  describe('handle', () => {
    it('random speak', () => {
      const node = {
        nextId: 'next-id',
        random_speak: ['one', 'two', 'three'],
        id: 'step-id',
        type: BaseNode.NodeType.SPEAK,
      };

      const topFrame = {
        storage: { set: sinon.stub() },
      };
      const runtime = {
        trace: { addTrace: sinon.stub() },
        storage: { produce: sinon.stub() },
        stack: { top: sinon.stub().returns(topFrame) },
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);

      const variables = { getState: sinon.stub().returns({}), set: sinon.stub(), get: sinon.stub() };

      expect(speakHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.nextId);
      expect(topFrame.storage.set.args[0][0]).to.eql(FrameType.OUTPUT);
      // output is one of the options in random_speak
      const spokenPhrase = runtime.trace.addTrace.args[0][0].payload.message as string;
      expect(node.random_speak.includes(topFrame.storage.set.args[0][1])).to.eql(true);
      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            payload: {
              message: spokenPhrase,
              type: 'message',
            },
            type: 'speak',
            time: mockTime,
          },
        ],
        [
          {
            payload: {
              kind: 'step.speak',
              level: 'info',
              message: {
                componentName: 'speak',
                stepID: 'step-id',
                text: spokenPhrase,
              },
              timestamp: getISO8601Timestamp(),
            },
            type: 'log',
            time: mockTime,
          },
        ],
      ]);
      expect(variables.set.args).to.eql([
        [VoiceflowConstants.BuiltInVariable.LAST_RESPONSE, spokenPhrase],
        ['_memory_', [{ content: 'one', role: 'assistant' }]],
        ['vf_memory', 'assistant: one'],
      ]);
    });

    it('speak', () => {
      const node = {
        speak: 'random {var} or {var1}',
        id: 'step-id',
        type: BaseNode.NodeType.SPEAK,
      };

      const topFrame = {
        storage: { set: sinon.stub() },
      };
      const runtime = {
        trace: { addTrace: sinon.stub() },
        storage: { produce: sinon.stub() },
        stack: { top: sinon.stub().returns(topFrame) },
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);

      const varState = { var: 1.234, var1: 'here' };
      const variables = { getState: sinon.stub().returns(varState), set: sinon.stub(), get: sinon.stub() };

      expect(speakHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
      // output has vars replaced and numbers turned to 2digits floats
      expect(topFrame.storage.set.args).to.eql([[FrameType.OUTPUT, 'random 1.23 or here']]);
      expect(runtime.trace.addTrace.args).to.eql([
        [{ type: 'speak', payload: { message: 'random 1.23 or here', type: 'message' }, time: mockTime }],
        [
          {
            type: 'log',
            payload: {
              kind: 'step.speak',
              level: 'info',
              message: {
                componentName: 'speak',
                stepID: 'step-id',
                text: 'random 1.23 or here',
              },
              timestamp: getISO8601Timestamp(),
            },
            time: mockTime,
          },
        ],
      ]);
      expect(variables.set.args).to.eql([
        [VoiceflowConstants.BuiltInVariable.LAST_RESPONSE, 'random 1.23 or here'],
        ['_memory_', [{ content: 'random 1.23 or here', role: 'assistant' }]],
        ['vf_memory', 'assistant: random 1.23 or here'],
      ]);
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
