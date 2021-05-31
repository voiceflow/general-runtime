import { expect } from 'chai';
import sinon from 'sinon';

import StartHandler from '@/runtime/lib/Handlers/start';

describe('startHandler unit tests', () => {
  const startHandler = StartHandler();

  describe('canHandle', () => {
    it('false', () => {
      expect(startHandler.canHandle({} as any, null as any, null as any, null as any)).to.eql(false);
      expect(startHandler.canHandle({ start: true, nextId: null } as any, null as any, null as any, null as any)).to.eql(false);
    });

    it('true', () => {
      expect(startHandler.canHandle({ start: true, nextId: 'next-id' } as any, null as any, null as any, null as any)).to.eql(true);
    });
  });

  describe('handle', () => {
    it('nextId', () => {
      const node = { nextId: 'next-id' };
      const runtime = { trace: { debug: sinon.stub() } };
      expect(startHandler.handle(node as any, runtime as any, null as any, null as any)).to.eql(node.nextId);
      expect(runtime.trace.debug.args).to.eql([['beginning flow']]);
    });

    it('no nextId', () => {
      const node = {};
      const runtime = { trace: { debug: sinon.stub() } };
      expect(startHandler.handle(node as any, runtime as any, null as any, null as any)).to.eql(null);
      expect(runtime.trace.debug.args).to.eql([['beginning flow']]);
    });
  });
});
