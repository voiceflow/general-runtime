import { BaseNode } from '@voiceflow/base-types';
import axios from 'axios';
import { expect } from 'chai';
import safeJSONStringify from 'json-stringify-safe';
import sinon from 'sinon';

import CodeHandler from '@/runtime/lib/Handlers/code';
import * as utils from '@/runtime/lib/Handlers/code/utils';

describe('codeHandler unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('canHandle', () => {
    it('false', () => {
      const codeHandler = CodeHandler();
      expect(codeHandler.canHandle({} as any, null as any, null as any, null as any)).to.eql(false);
    });

    it('true', () => {
      const codeHandler = CodeHandler({ endpoint: '' });
      expect(codeHandler.canHandle({ code: 'foo()' } as any, null as any, null as any, null as any)).to.eql(true);
    });
  });

  describe('handle', () => {
    describe('catch', () => {
      afterEach(() => {
        sinon.restore();
      });

      it('no fail_id', async () => {
        const codeHandler = CodeHandler({ endpoint: 'foo' });
        const err = { response: { data: { foo: 'bar' } } };
        const axiosPost = sinon.stub(axios, 'post').throws(err);

        const node = { code: 'foo()' };
        const runtime = { trace: { debug: sinon.stub() } };
        const variables = { keys: sinon.stub().returns([]), getState: sinon.stub().returns({}) };
        const result = await codeHandler.handle(node as any, runtime as any, variables as any, null as any);
        expect(result).to.eql(null);
        expect(axiosPost.args).to.eql([['foo', { code: node.code, variables: {}, keys: [] }]]);
        expect(runtime.trace.debug.args).to.eql([
          [`unable to resolve code  \n\`${safeJSONStringify(err.response.data)}\``, BaseNode.NodeType.CODE],
        ]);
      });

      it('with fail_id', async () => {
        const codeHandler = CodeHandler({ endpoint: 'foo' });
        const error = {};
        const axiosPost = sinon.stub(axios, 'post').throws(error);

        const node = { code: 'foo()', fail_id: 'fail-id' };
        const runtime = { trace: { debug: sinon.stub() } };
        const variables = { keys: sinon.stub().returns([]), getState: sinon.stub().returns({}) };
        const result = await codeHandler.handle(node as any, runtime as any, variables as any, null as any);
        expect(result).to.eql(node.fail_id);
        expect(axiosPost.args).to.eql([['foo', { code: node.code, variables: {}, keys: [] }]]);
        expect(runtime.trace.debug.args).to.eql([
          [`unable to resolve code  \n\`"${error.toString()}"\``, BaseNode.NodeType.CODE],
        ]);
      });
    });

    describe('success', () => {
      afterEach(() => {
        sinon.restore();
      });

      it('with variables changes', async () => {
        const codeHandler = CodeHandler({ endpoint: 'foo' });
        const axiosPost = sinon.stub(axios, 'post').resolves({ data: { var1: 1.1, var2: 2.2, newVar: 5 } });

        const node = { code: 'var1(); var2(); var3();', success_id: 'success-id' };
        const runtime = { trace: { debug: sinon.stub() } };
        const variables = {
          merge: sinon.stub(),
          getState: sinon.stub().returns({ var1: 1, var2: 2, var3: 3 }),
        };
        const result = await codeHandler.handle(node as any, runtime as any, variables as any, null as any);
        expect(result).to.eql(node.success_id);
        expect(axiosPost.args).to.eql([
          ['foo', { code: node.code, variables: { var1: 1, var2: 2, var3: 3 }, keys: [] }],
        ]);
        expect(runtime.trace.debug.args).to.eql([
          [
            'evaluating code - changes:  \n`{var1}`: `1` => `1.1`  \n`{var2}`: `2` => `2.2`  \n`{var3}`: `3` => `undefined`  \n`{newVar}`: `undefined` => `5`  \n',
            BaseNode.NodeType.CODE,
          ],
        ]);
      });

      it('with undefined keys', async () => {
        const codeHandler = CodeHandler({ endpoint: 'foo' });
        const axiosPost = sinon.stub(axios, 'post').resolves({ data: { var1: 1.1, var2: 2.2, newVar: 5 } });

        const node = { code: 'var1(); var2(); var3();', success_id: 'success-id' };
        const runtime = { trace: { debug: sinon.stub() } };
        const variables = {
          merge: sinon.stub(),
          getState: sinon.stub().returns({ var1: undefined, var2: undefined, var3: 3 }),
        };
        const result = await codeHandler.handle(node as any, runtime as any, variables as any, null as any);
        expect(result).to.eql(node.success_id);
        expect(axiosPost.args).to.eql([
          [
            'foo',
            { code: node.code, variables: { var1: undefined, var2: undefined, var3: 3 }, keys: ['var1', 'var2'] },
          ],
        ]);
        expect(runtime.trace.debug.args).to.eql([
          [
            'evaluating code - changes:  \n`{var1}`: `undefined` => `1.1`  \n`{var2}`: `undefined` => `2.2`  \n`{var3}`: `3` => `undefined`  \n`{newVar}`: `undefined` => `5`  \n',
            BaseNode.NodeType.CODE,
          ],
        ]);
      });

      it('no variables changes', async () => {
        const codeHandler = CodeHandler({ endpoint: 'foo' });
        const axiosPost = sinon.stub(axios, 'post').resolves({ data: { var1: 1 } });

        const node = { code: 'var1();' };
        const runtime = { trace: { debug: sinon.stub() } };
        const variables = { merge: sinon.stub(), getState: sinon.stub().returns({ var1: 1 }) };
        const result = await codeHandler.handle(node as any, runtime as any, variables as any, null as any);
        expect(result).to.eql(null);
        expect(axiosPost.args).to.eql([['foo', { code: node.code, variables: { var1: 1 }, keys: [] }]]);
        expect(runtime.trace.debug.args).to.eql([['evaluating code - no variable changes', BaseNode.NodeType.CODE]]);
      });
    });

    describe('no endpoint - local', () => {
      afterEach(() => {
        sinon.restore();
      });

      it('works correctly', async () => {
        const codeHandler = CodeHandler({ endpoint: null });
        const vmExecuteStub = sinon.stub(utils, 'vmExecute').returns({ var1: 1.1, var2: 2.2, newVar: 5 });

        const node = { code: 'var1(); var2(); var3();', success_id: 'success-id' };
        const runtime = { trace: { debug: sinon.stub() } };
        const variables = {
          merge: sinon.stub(),
          getState: sinon.stub().returns({ var1: 1, var2: 2, var3: 3 }),
        };
        const result = await codeHandler.handle(node as any, runtime as any, variables as any, null as any);
        expect(result).to.eql(node.success_id);
        expect(vmExecuteStub.args).to.eql([
          [{ code: node.code, variables: { var1: 1, var2: 2, var3: 3 } }, false, undefined],
        ]);
        expect(runtime.trace.debug.args).to.eql([
          [
            'evaluating code - changes:  \n`{var1}`: `1` => `1.1`  \n`{var2}`: `2` => `2.2`  \n`{var3}`: `3` => `undefined`  \n`{newVar}`: `undefined` => `5`  \n',
            BaseNode.NodeType.CODE,
          ],
        ]);
      });

      it('exes callbacks', async () => {
        let res = 0;
        const callbacks = {
          setRes: (c: number) => {
            res = c;
          },
          add: (a: number, b: number) => {
            return a + b;
          },
        };
        const codeHandler = CodeHandler({ endpoint: null, callbacks, testingEnv: true });

        const node = {
          code: 'const c  = add(a, b); setRes(c);',
          success_id: 'success-id',
        };
        const runtime = { trace: { debug: sinon.stub() } };
        const variables = {
          merge: sinon.stub(),
          getState: sinon.stub().returns({ a: 1, b: 4 }),
        };
        const result = await codeHandler.handle(node as any, runtime as any, variables as any, null as any);
        expect(result).to.eql(node.success_id);
        expect(res).to.eql(5);
      });
    });

    describe('useStrictVM is true', () => {
      afterEach(() => {
        sinon.restore();
      });

      it('works correctly', async () => {
        const codeHandler = CodeHandler({ endpoint: null, useStrictVM: true });
        const ivmExecuteStub = sinon.stub(utils, 'ivmExecute').resolves({ var1: 1.1, var2: 2.2, newVar: 5 });

        const node = { code: 'var1(); var2(); var3();', success_id: 'success-id' };
        const runtime = { trace: { debug: sinon.stub() } };
        const variables = {
          merge: sinon.stub(),
          getState: sinon.stub().returns({ var1: 1, var2: 2, var3: 3 }),
        };
        const result = await codeHandler.handle(node as any, runtime as any, variables as any, null as any);
        expect(result).to.eql(node.success_id);
        expect(ivmExecuteStub.args).to.eql([
          [{ code: node.code, variables: { var1: 1, var2: 2, var3: 3 } }, undefined],
        ]);
        expect(runtime.trace.debug.args).to.eql([
          [
            'evaluating code - changes:  \n`{var1}`: `1` => `1.1`  \n`{var2}`: `2` => `2.2`  \n`{var3}`: `3` => `undefined`  \n`{newVar}`: `undefined` => `5`  \n',
            BaseNode.NodeType.CODE,
          ],
        ]);
      });

      it('exes callbacks', async () => {
        let res = 0;
        const callbacks = {
          setRes: (c: number) => {
            res = c;
          },
        };
        const codeHandler = CodeHandler({ endpoint: null, callbacks, useStrictVM: true });

        const node = {
          code: 'const c  = a + b; setRes(c);',
          success_id: 'success-id',
        };
        const runtime = { trace: { debug: sinon.stub() } };
        const variables = {
          merge: sinon.stub(),
          getState: sinon.stub().returns({ a: 1, b: 4 }),
        };
        const result = await codeHandler.handle(node as any, runtime as any, variables as any, null as any);
        expect(result).to.eql(node.success_id);
        expect(res).to.eql(5);
      });
    });
  });
});
