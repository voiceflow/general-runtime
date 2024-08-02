import { BaseNode, RuntimeLogs } from '@voiceflow/base-types';
import { expect } from 'chai';
import sinon from 'sinon';

import * as CodeHandler from '@/runtime/lib/Handlers/code';
import SetV2Handler from '@/runtime/lib/Handlers/setV2';
import DebugLogging from '@/runtime/lib/Runtime/DebugLogging';
import { getISO8601Timestamp } from '@/runtime/lib/Runtime/DebugLogging/utils';
import Store from '@/runtime/lib/Runtime/Store';
import { mockTime } from '@/tests/lib/services/dialog/fixture';

describe('setV2 handler unit tests', () => {
  beforeEach(() => sinon.useFakeTimers(mockTime));

  afterEach(() => sinon.restore());

  describe('canHandle', () => {
    it('false', () => {
      expect(SetV2Handler().canHandle({ type: 'random' } as any, null as any, null as any, null as any)).to.eql(false);
    });

    it('true', () => {
      expect(
        SetV2Handler().canHandle({ type: BaseNode.NodeType.SET_V2 } as any, null as any, null as any, null as any)
      ).to.eql(true);
    });
  });

  describe('handle', () => {
    it('no nextId', async () => {
      const handler = SetV2Handler();
      const codeHandler = { handle: sinon.stub() };
      const CodeHandlerStub = sinon.stub(CodeHandler, 'default').returns(codeHandler as any);

      const node = {
        sets: [
          { variable: 'a', expression: 'undefined' },
          { variable: 'b', expression: 'NaN' },
          { variable: 'c', expression: '(1 + 8)/3' },
        ],
        id: 'step-id',
        type: BaseNode.NodeType.SET_V2,
      };
      const runtime = {
        trace: { debug: sinon.stub(), addTrace: sinon.stub() },
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
      const variables = {
        has: sinon.stub().returns(true),
        get: (variable: string) => {
          switch (variable) {
            case 'a':
              return 'a-value';
            case 'b':
              return 'b-value';
            case 'c':
              return 'c-value';
            default:
              return undefined;
          }
        },
      };
      const program = { lines: [] };

      const eventHandler = sinon.stub();

      expect(await handler.handle(node as any, runtime as any, variables as any, program as any, eventHandler)).to.eql(
        null
      );

      expect(CodeHandlerStub.calledOnce).to.eql(true);
      expect(CodeHandlerStub.args).to.eql([[]]);

      expect(codeHandler.handle.args).to.eql([
        [
          {
            code: [
              'let evaluated;',
              'evaluated = eval(`undefined`);',
              'a = !!evaluated || !Number.isNaN(evaluated) ? evaluated : undefined;',
              'evaluated = eval(`NaN`);',
              'b = !!evaluated || !Number.isNaN(evaluated) ? evaluated : undefined;',
              'evaluated = eval(`(1 + 8)/3`);',
              'c = !!evaluated || !Number.isNaN(evaluated) ? evaluated : undefined;',
            ].join('\n'),
            id: 'PROGRAMMATICALLY-GENERATED-CODE-NODE',
            type: BaseNode.NodeType.CODE,
          },
          runtime,
          variables,
          program,
          eventHandler,
        ],
      ]);
      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: 'log',
            payload: {
              kind: 'step.set',
              message: {
                changedVariables: {
                  // The test doesn't mock out the code execution to update the variables, so the values retrieved with
                  // variables.get() stay the same.
                  a: { before: 'a-value', after: 'a-value' },
                  b: { before: 'b-value', after: 'b-value' },
                  c: { before: 'c-value', after: 'c-value' },
                },
                stepID: 'step-id',
                componentName: RuntimeLogs.Kinds.StepLogKind.SET,
              },
              level: RuntimeLogs.LogLevel.INFO,
              timestamp: getISO8601Timestamp(),
            },
            time: mockTime,
          },
        ],
      ]);
    });

    it('with nextId', async () => {
      const handler = SetV2Handler();

      const node = {
        nextId: 'next-id',
        id: 'step-id',
        type: BaseNode.NodeType.SET_V2,
        sets: [
          { variable: 'a', expression: 'undefined' },
          {}, // no variable
          { variable: 'b', expression: 'NaN' },
          { variable: 'newVar', expression: '1 + 3' },
          { variable: 'c', expression: '(1 + 8)/3' },
        ],
      };
      const runtime = {
        trace: { debug: sinon.stub(), addTrace: sinon.stub() },
        debugLogging: null as unknown as DebugLogging,
        variables: new Store(),
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);

      const variables = new Store();
      variables.set('a', 0);
      variables.set('b', 0);
      variables.set('c', 0);

      const program = { lines: [] };

      expect(await handler.handle(node as any, runtime as any, variables as any, program as any)).to.eql(node.nextId);
      expect(variables.getState()).to.eql({ a: undefined, b: undefined, c: 3, newVar: 4 });
      expect(runtime.variables.getState()).to.eql({ newVar: 0 });
      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: 'log',
            payload: {
              kind: 'step.set',
              message: {
                changedVariables: {
                  a: { before: 0, after: null },
                  b: { before: 0, after: null },
                  c: { before: 0, after: 3 },
                  newVar: { before: 0, after: 4 },
                },
                stepID: 'step-id',
                componentName: RuntimeLogs.Kinds.StepLogKind.SET,
              },
              level: RuntimeLogs.LogLevel.INFO,
              timestamp: getISO8601Timestamp(),
            },
            time: mockTime,
          },
        ],
      ]);
    });
  });
});
