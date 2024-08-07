import { BaseNode, RuntimeLogs } from '@voiceflow/base-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { TextHandler } from '@/lib/services/runtime/handlers/text';
import { addOutputTrace } from '@/lib/services/runtime/utils';
import DebugLogging from '@/runtime/lib/Runtime/DebugLogging';
import { getISO8601Timestamp } from '@/runtime/lib/Runtime/DebugLogging/utils';

import { mockTime } from '../../dialog/fixture';

describe('text handler unit tests', async () => {
  beforeEach(() => sinon.useFakeTimers(mockTime));

  afterEach(() => sinon.restore());

  describe('canHandle', () => {
    it('false', async () => {
      expect(
        TextHandler(null as any).canHandle({ type: 'speak' } as any, null as any, null as any, null as any)
      ).to.eql(false);
      expect(TextHandler(null as any).canHandle({} as any, null as any, null as any, null as any)).to.eql(false);
    });

    it('true', async () => {
      expect(TextHandler(null as any).canHandle({ type: 'text' } as any, null as any, null as any, null as any)).to.eql(
        true
      );
    });
  });

  describe('handle', () => {
    it('works', async () => {
      const newSlate = { content: [{ children: [{ text: 'injectedSlate' }] }] };
      const textTrace = { type: 'text', payload: { slate: newSlate, message: 'plainText' } };
      const sample = { content: [{ children: [{ text: 'sampledSlate' }] }] };

      const utils = {
        textOutputTrace: sinon.stub().returns(textTrace),
        addOutputTrace,
        _sample: sinon.stub().returns(sample),
      };

      const node = {
        texts: [1, 2, 3],
        nextId: 'nextId',
        id: 'step-id',
        type: BaseNode.NodeType.TEXT,
      };

      const topStorageSet = sinon.stub();

      const runtime = {
        stack: {
          top: sinon.stub().returns({ storage: { set: topStorageSet } }),
        },
        trace: { addTrace: sinon.stub() },
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);

      const variables = { getState: sinon.stub().returns('vars'), set: sinon.stub(), get: sinon.stub() };

      const textHandler = TextHandler(utils as any);
      await expect(
        textHandler.handle(node as any, runtime as any, variables as any, null as any, () => undefined)
      ).eventually.to.eql(node.nextId);
      expect(runtime.trace.addTrace.args).to.eql([
        [textTrace],
        [
          {
            type: 'log',
            payload: {
              kind: 'step.text',
              level: RuntimeLogs.LogLevel.INFO,
              message: {
                stepID: 'step-id',
                componentName: RuntimeLogs.Kinds.StepLogKind.TEXT,
                plainContent: 'plainText',
                richContent: newSlate,
              },
              timestamp: getISO8601Timestamp(),
            },
            time: mockTime,
          },
        ],
      ]);
      expect(utils.textOutputTrace.args).to.eql([
        [{ delay: undefined, output: sample.content, version: undefined, variables }],
      ]);
      expect(utils._sample.args).to.eql([[node.texts]]);
      expect(topStorageSet.args).to.eql([['output', newSlate.content]]);
    });
  });
});
