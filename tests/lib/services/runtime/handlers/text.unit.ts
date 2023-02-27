import { BaseNode, RuntimeLogs } from '@voiceflow/base-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { TextHandler } from '@/lib/services/runtime/handlers/text';
import { Variables } from '@/lib/services/runtime/types';
import DebugLogging from '@/runtime/lib/Runtime/DebugLogging';
import { getISO8601Timestamp } from '@/runtime/lib/Runtime/DebugLogging/utils';

describe('text handler unit tests', async () => {
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
    it('works', () => {
      const newSlate = { content: [{ children: { text: 'injectedSlate' } }] };
      const utils = {
        _sample: sinon.stub().returns({ content: [{ children: { text: 'sampledSlate' } }] }),
        slateToPlaintext: sinon.stub().returns('plainText'),
        sanitizeVariables: sinon.stub().returns('sanitizedVars'),
        slateInjectVariables: sinon.stub().returns(newSlate.content),
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

      const variables = { getState: sinon.stub().returns('vars'), set: sinon.stub() };

      const textHandler = TextHandler(utils as any);
      expect(textHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.nextId);
      expect(runtime.trace.addTrace.args).to.eql([
        [{ type: 'text', payload: { slate: newSlate, message: 'plainText' } }],
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
          },
        ],
      ]);
      expect(variables.getState.callCount).to.eql(1);
      expect(utils._sample.args).to.eql([[node.texts]]);
      expect(utils.sanitizeVariables.args).to.eql([['vars']]);
      expect(utils.slateToPlaintext.args).to.eql([[newSlate.content]]);
      expect(utils.slateInjectVariables.args).to.eql([[[{ children: { text: 'sampledSlate' } }], 'sanitizedVars']]);
      expect(topStorageSet.args).to.eql([['output', newSlate.content]]);
      expect(variables.set.args).to.eql([[Variables.LAST_RESPONSE, 'plainText']]);
    });
  });
});
