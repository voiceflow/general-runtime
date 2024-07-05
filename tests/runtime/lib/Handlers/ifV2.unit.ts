import { BaseNode, RuntimeLogs } from '@voiceflow/base-types';
import { expect } from 'chai';
import sinon from 'sinon';

import * as CodeHandler from '@/runtime/lib/Handlers/code';
import IfV2Handler from '@/runtime/lib/Handlers/ifV2';
import DebugLogging from '@/runtime/lib/Runtime/DebugLogging';
import { getISO8601Timestamp } from '@/runtime/lib/Runtime/DebugLogging/utils';
import { mockTime } from '@/tests/lib/services/dialog/fixture';

describe('ifV2 handler unit tests', () => {
  beforeEach(() => sinon.useFakeTimers(mockTime));

  afterEach(() => sinon.restore());

  describe('canHandle', () => {
    it('false', () => {
      expect(IfV2Handler({} as any).canHandle({ type: 'random' } as any, null as any, null as any, null as any)).to.eql(
        false
      );
    });

    it('true', () => {
      expect(
        IfV2Handler({} as any).canHandle(
          { type: BaseNode.NodeType.IF_V2 } as any,
          null as any,
          null as any,
          null as any
        )
      ).to.eql(true);
    });
  });

  describe('handle', () => {
    describe('_v1', () => {
      it('handles', async () => {
        const output = 'output';
        const _v1 = { handle: sinon.stub().resolves(output) };
        const handler = IfV2Handler({ _v1 } as any);
        const codeHandler = { handle: sinon.stub() };
        sinon.stub(CodeHandler, 'default').returns(codeHandler as any);
        const eventHandler = sinon.stub();

        const node = { payload: { expressions: [] }, paths: [] };
        const runtime = {
          trace: { debug: sinon.stub() },
          turn: { get: sinon.stub().returns([BaseNode.NodeType.IF_V2]) },
        };
        const variables = { var1: 'val1' };
        const program = { lines: [] };

        expect(
          await handler.handle(node as any, runtime as any, variables as any, program as any, eventHandler)
        ).to.eql(output);
        expect(_v1.handle.args).to.eql([[node, runtime, variables, program, eventHandler]]);
      });
    });

    describe('no match', () => {
      it('with elseId', async () => {
        const handler = IfV2Handler({} as any);
        const codeHandler = { handle: sinon.stub() };
        const CodeHandlerStub = sinon.stub(CodeHandler, 'default').returns(codeHandler as any);

        const node = {
          payload: { expressions: ['a && b', 'arr.includes(a) && !b'], elseId: 'else-id' },
          paths: [],
          id: 'step-id',
          type: BaseNode.NodeType.IF_V2,
        };
        const runtime = {
          trace: { debug: sinon.stub(), addTrace: sinon.stub() },
          turn: { get: sinon.stub().returns(null) },
          debugLogging: null as unknown as DebugLogging,
        };
        runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
        const variables = { var1: 'val1' };
        const program = { lines: [], getNode: (id: string) => ({ id, type: BaseNode.NodeType.SPEAK }) };

        const eventHandler = sinon.stub();

        expect(
          await handler.handle(node as any, runtime as any, variables as any, program as any, eventHandler)
        ).to.eql(node.payload.elseId);

        expect(CodeHandlerStub.calledOnce).to.eql(true);
        expect(Object.keys((CodeHandlerStub.args[0][0] as any).callbacks)).to.eql(['setOutputPort', 'addDebugError']);
        expect(typeof (CodeHandlerStub.args[0][0] as any).callbacks.setOutputPort).to.eql('function');

        expect(codeHandler.handle.args).to.eql([
          [
            {
              code: 'try { \n            try {\n              if(eval(`a && b`)) {\n                setOutputPort(0);\n                throw(null);\n              }\n            } catch (err) {\n              if (err != null) {\n                addDebugError({ index: 1, expression: `a && b`, msg: err.toString() });\n              } else {\n                // matched - exit early\n                throw(null);\n              }\n            }\n        \n            try {\n              if(eval(`arr.includes(a) && !b`)) {\n                setOutputPort(1);\n                throw(null);\n              }\n            } catch (err) {\n              if (err != null) {\n                addDebugError({ index: 2, expression: `arr.includes(a) && !b`, msg: err.toString() });\n              } else {\n                // matched - exit early\n                throw(null);\n              }\n            }\n         } catch (err) {}',
              id: 'PROGRAMMATICALLY-GENERATED-CODE-NODE',
              type: BaseNode.NodeType.CODE,
            },
            runtime,
            variables,
            program,
            eventHandler,
          ],
        ]);

        expect(runtime.trace.debug.args).to.eql([
          ['no conditions matched - taking else path', BaseNode.NodeType.IF_V2],
        ]);
        expect(runtime.trace.addTrace.args).to.eql([
          [
            {
              type: 'log',
              payload: {
                kind: 'step.condition',
                level: RuntimeLogs.LogLevel.INFO,
                message: {
                  stepID: 'step-id',
                  componentName: RuntimeLogs.Kinds.StepLogKind.CONDITION,
                  path: {
                    stepID: 'else-id',
                    componentName: RuntimeLogs.Kinds.StepLogKind.SPEAK,
                  },
                },
                timestamp: getISO8601Timestamp(),
              },
              time: mockTime,
            },
          ],
        ]);
      });

      it('no elseId', async () => {
        const handler = IfV2Handler({} as any);
        const codeHandler = { handle: sinon.stub() };
        sinon.stub(CodeHandler, 'default').returns(codeHandler as any);

        const node = { payload: { expressions: [] }, paths: [], id: 'step-id', type: BaseNode.NodeType.IF_V2 };
        const runtime = {
          trace: { debug: sinon.stub(), addTrace: sinon.stub() },
          turn: { get: sinon.stub().returns([]) },
          debugLogging: null as unknown as DebugLogging,
        };
        runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
        const variables = { var1: 'val1' };
        const program = { lines: [] };

        expect(await handler.handle(node as any, runtime as any, variables as any, program as any)).to.eql(null);
        expect(runtime.trace.addTrace.args).to.eql([
          [
            {
              type: 'log',
              payload: {
                kind: 'step.condition',
                level: RuntimeLogs.LogLevel.INFO,
                message: {
                  stepID: 'step-id',
                  componentName: RuntimeLogs.Kinds.StepLogKind.CONDITION,
                  path: null,
                },
                timestamp: getISO8601Timestamp(),
              },
              time: mockTime,
            },
          ],
        ]);
      });
    });

    describe('match', () => {
      it('works', async () => {
        const handler = IfV2Handler({ safe: false } as any);

        const node = {
          id: 'step-id',
          type: BaseNode.NodeType.IF_V2,
          payload: {
            expressions: ['a && b', 'a + b)', 'arr.includes(a) && !b', 'a === 3'], // second condition is malformed. forth condition is also true, but we exit early when there's a match
            elseId: 'else-id',
          },
          paths: [
            { nextID: 'first-next' },
            { nextID: 'second-next' },
            { nextID: 'third-next' },
            { nextID: 'forth-next' },
          ],
        };
        const runtime = {
          trace: { debug: sinon.stub(), addTrace: sinon.stub() },
          turn: { get: sinon.stub().returns(null) },
          debugLogging: null as unknown as DebugLogging,
        };
        runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
        const variables = { getState: sinon.stub().returns({ a: 3, b: false, arr: [1, 3, 5] }), merge: sinon.stub() };
        const program = { lines: [], getNode: (id: string) => ({ id, type: BaseNode.NodeType.SPEAK }) };

        expect(await handler.handle(node as any, runtime as any, variables as any, program as any)).to.eql(
          node.paths[2].nextID
        );

        expect(runtime.trace.debug.args).to.eql([
          ['evaluating code - no variable changes', BaseNode.NodeType.CODE],
          [
            `Error condition 2 - "${node.payload.expressions[1]}": SyntaxError: Unexpected token ')'`,
            BaseNode.NodeType.IF_V2,
          ],
          ['condition matched - taking path 3', BaseNode.NodeType.IF_V2],
        ]);
        expect(runtime.trace.addTrace.args).to.eql([
          [
            {
              type: 'log',
              payload: {
                kind: 'step.condition',
                level: RuntimeLogs.LogLevel.INFO,
                message: {
                  stepID: 'step-id',
                  componentName: RuntimeLogs.Kinds.StepLogKind.CONDITION,
                  path: {
                    stepID: 'third-next',
                    componentName: RuntimeLogs.Kinds.StepLogKind.SPEAK,
                  },
                },
                timestamp: getISO8601Timestamp(),
              },
              time: mockTime,
            },
          ],
        ]);
      });
    });
  });
});
