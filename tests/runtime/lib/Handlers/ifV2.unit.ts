import { BaseNode } from '@voiceflow/base-types';
import { expect } from 'chai';
import sinon from 'sinon';

import * as CodeHandler from '@/runtime/lib/Handlers/code';
import IfV2Handler from '@/runtime/lib/Handlers/ifV2';

describe('ifV2 handler unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('canHandle', () => {
    it('false', () => {
      expect(IfV2Handler({} as any).canHandle({ type: 'random' } as any, null as any, null as any, null as any)).to.eql(false);
    });

    it('true', () => {
      expect(IfV2Handler({} as any).canHandle({ type: BaseNode.NodeType.IF_V2 } as any, null as any, null as any, null as any)).to.eql(true);
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

        const node = { payload: { expressions: [] }, paths: [] };
        const runtime = { trace: { debug: sinon.stub() }, turn: { get: sinon.stub().returns([BaseNode.NodeType.IF_V2]) } };
        const variables = { var1: 'val1' };
        const program = { lines: [] };

        expect(await handler.handle(node as any, runtime as any, variables as any, program as any)).to.eql(output);
        expect(_v1.handle.args).to.eql([[node, runtime, variables, program]]);
      });
    });

    describe('no match', () => {
      it('with elseId', async () => {
        const handler = IfV2Handler({} as any);
        const codeHandler = { handle: sinon.stub() };
        const CodeHandlerStub = sinon.stub(CodeHandler, 'default').returns(codeHandler as any);

        const node = { payload: { expressions: ['a && b', 'arr.includes(a) && !b'], elseId: 'else-id' }, paths: [] };
        const runtime = { trace: { debug: sinon.stub() }, turn: { get: sinon.stub().returns(null) } };
        const variables = { var1: 'val1' };
        const program = { lines: [] };

        expect(await handler.handle(node as any, runtime as any, variables as any, program as any)).to.eql(node.payload.elseId);

        expect(CodeHandlerStub.calledOnce).to.eql(true);
        expect(Object.keys((CodeHandlerStub.args[0][0] as any).callbacks)).to.eql(['setOutputPort', 'addDebugError']);
        expect(typeof (CodeHandlerStub.args[0][0] as any).callbacks.setOutputPort).to.eql('function');

        expect(codeHandler.handle.args).to.eql([
          [
            {
              code:
                'try { \n            try {\n              if(eval(`a && b`)) {\n                setOutputPort(0);\n                throw(null);\n              }\n            } catch (err) {\n              if (err != null) {\n                addDebugError({ index: 1, expression: `a && b`, msg: err.toString() });\n              } else {\n                // matched - exit early\n                throw(null);\n              }\n            }\n        \n            try {\n              if(eval(`arr.includes(a) && !b`)) {\n                setOutputPort(1);\n                throw(null);\n              }\n            } catch (err) {\n              if (err != null) {\n                addDebugError({ index: 2, expression: `arr.includes(a) && !b`, msg: err.toString() });\n              } else {\n                // matched - exit early\n                throw(null);\n              }\n            }\n         } catch (err) {}',
              id: 'PROGRAMMATICALLY-GENERATED-CODE-NODE',
              type: BaseNode.NodeType.CODE,
            },
            runtime,
            variables,
            program,
          ],
        ]);

        expect(runtime.trace.debug.args).to.eql([['no conditions matched - taking else path', BaseNode.NodeType.IF_V2]]);
      });

      it('no elseId', async () => {
        const handler = IfV2Handler({} as any);
        const codeHandler = { handle: sinon.stub() };
        sinon.stub(CodeHandler, 'default').returns(codeHandler as any);

        const node = { payload: { expressions: [] }, paths: [] };
        const runtime = { trace: { debug: sinon.stub() }, turn: { get: sinon.stub().returns([]) } };
        const variables = { var1: 'val1' };
        const program = { lines: [] };

        expect(await handler.handle(node as any, runtime as any, variables as any, program as any)).to.eql(null);
      });
    });

    describe('match', () => {
      it('works', async () => {
        const handler = IfV2Handler({ safe: false } as any);

        const node = {
          payload: {
            expressions: ['a && b', 'a + b)', 'arr.includes(a) && !b', 'a === 3'], // second condition is malformed. forth condition is also true, but we exit early when there's a match
            elseId: 'else-id',
          },
          paths: [{ nextID: 'first-next' }, { nextID: 'second-next' }, { nextID: 'third-next' }, { nextID: 'forth-next' }],
        };
        const runtime = { trace: { debug: sinon.stub() }, turn: { get: sinon.stub().returns(null) } };
        const variables = { getState: sinon.stub().returns({ a: 3, b: false, arr: [1, 3, 5] }), merge: sinon.stub() };
        const program = { lines: [] };

        expect(await handler.handle(node as any, runtime as any, variables as any, program as any)).to.eql(node.paths[2].nextID);

        expect(runtime.trace.debug.args).to.eql([
          ['evaluating code - no variable changes', BaseNode.NodeType.CODE],
          [`Error condition 2 - "${node.payload.expressions[1]}": SyntaxError: Unexpected token ')'`, BaseNode.NodeType.IF_V2],
          ['condition matched - taking path 3', BaseNode.NodeType.IF_V2],
        ]);
      });
    });
  });
});
