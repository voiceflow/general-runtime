import { expect } from 'chai';
import sinon from 'sinon';

import { slateInjectVariables, TextHandler } from '@/lib/services/runtime/handlers/text';

describe('text handler unit tests', async () => {
  afterEach(() => sinon.restore());

  describe('canHandle', () => {
    it('false', async () => {
      expect(TextHandler(null as any).canHandle({ type: 'speak' } as any, null as any, null as any, null as any)).to.eql(false);
      expect(TextHandler(null as any).canHandle({} as any, null as any, null as any, null as any)).to.eql(false);
    });

    it('true', async () => {
      expect(TextHandler(null as any).canHandle({ type: 'text' } as any, null as any, null as any, null as any)).to.eql(true);
    });
  });

  describe('handle', () => {
    it('works', () => {
      const newSlate = { content: 'injectedSlate' };
      const utils = {
        _sample: sinon.stub().returns('sampledSlate'),
        sanitizeVariables: sinon.stub().returns('sanitizedVars'),
        slateToPlaintext: sinon.stub().returns('plainText'),
        slateInjectVariables: sinon.stub().returns(newSlate),
      };

      const node = {
        texts: [1, 2, 3],
        nextId: 'nextId',
      };

      const runtime = {
        trace: { addTrace: sinon.stub() },
      };

      const variables = { getState: sinon.stub().returns('vars') };

      const textHandler = TextHandler(utils as any);
      expect(textHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.nextId);
      expect(runtime.trace.addTrace.args).to.eql([[{ type: 'text', payload: { slate: newSlate, text: 'plainText' } }]]);
      expect(variables.getState.callCount).to.eql(1);
      expect(utils._sample.args).to.eql([[node.texts]]);
      expect(utils.sanitizeVariables.args).to.eql([['vars']]);
      expect(utils.slateToPlaintext.args).to.eql([['injectedSlate']]);
      expect(utils.slateInjectVariables.args).to.eql([['sampledSlate', 'sanitizedVars']]);
    });
  });

  describe('utils', () => {
    it('slateInjectVariables', () => {
      const variableState = { var1: 'first', var2: 'second', var3: ['third', 'fourth'] };
      const slate = {
        id: '1',
        content: [{ text: 'test {var1}', underline: true, property: 'prop {var3}' }, { text: ' ' }, { children: [{ text: ' nice {var2} var' }] }],
      };

      const expectedSlate = {
        id: '1',
        content: [
          { text: 'test first', underline: true, property: 'prop third,fourth' },
          { text: ' ' },
          { children: [{ text: ' nice second var' }] },
        ],
      };

      expect(slateInjectVariables(slate as any, variableState)).to.eql(expectedSlate);
    });
  });
});
