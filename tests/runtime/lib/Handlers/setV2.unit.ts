import { NodeType } from '@voiceflow/general-types';
import { expect } from 'chai';
import sinon from 'sinon';

import * as CodeHandler from '@/runtime/lib/Handlers/code';
import SetV2Handler from '@/runtime/lib/Handlers/setV2';
import Store from '@/runtime/lib/Runtime/Store';

describe('setV2 handler unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('canHandle', () => {
    it('false', () => {
      expect(SetV2Handler().canHandle({ type: 'random' } as any, null as any, null as any, null as any)).to.eql(false);
    });

    it('true', () => {
      expect(SetV2Handler().canHandle({ type: NodeType.SET_V2 } as any, null as any, null as any, null as any)).to.eql(true);
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
      };
      const runtime = { trace: { debug: sinon.stub() } };
      const variables = { var1: 'val1', has: sinon.stub().returns(true) };
      const program = { lines: [] };

      expect(await handler.handle(node as any, runtime as any, variables as any, program as any)).to.eql(null);

      expect(CodeHandlerStub.calledOnce).to.eql(true);
      expect(CodeHandlerStub.args).to.eql([[{ safe: undefined }]]);

      expect(codeHandler.handle.args).to.eql([
        [
          {
            code:
              '\n        let evaluated;\n    \n            evaluated = eval(`undefined`);\n            a = !!evaluated || !Number.isNaN(evaluated) ? evaluated : undefined;\n        \n            evaluated = eval(`NaN`);\n            b = !!evaluated || !Number.isNaN(evaluated) ? evaluated : undefined;\n        \n            evaluated = eval(`(1 + 8)/3`);\n            c = !!evaluated || !Number.isNaN(evaluated) ? evaluated : undefined;\n        ',
            id: 'PROGRAMMATICALLY-GENERATED-CODE-NODE',
            type: NodeType.CODE,
          },
          runtime,
          variables,
          program,
        ],
      ]);
    });

    it('with nextId', async () => {
      const handler = SetV2Handler({ safe: false });

      const node = {
        nextId: 'next-id',
        sets: [
          { variable: 'a', expression: 'undefined' },
          {}, // no variable
          { variable: 'b', expression: 'NaN' },
          { variable: 'newVar', expression: '1 + 3' },
          { variable: 'c', expression: '(1 + 8)/3' },
        ],
      };
      const runtime = { trace: { debug: sinon.stub() }, variables: new Store() };

      const variables = new Store();
      variables.set('a', 0);
      variables.set('b', 0);
      variables.set('c', 0);

      const program = { lines: [] };

      expect(await handler.handle(node as any, runtime as any, variables as any, program as any)).to.eql(node.nextId);
      expect(variables.getState()).to.eql({ a: undefined, b: undefined, c: 3, newVar: 4 });
      expect(runtime.variables.getState()).to.eql({ newVar: 0 });
    });
  });
});
