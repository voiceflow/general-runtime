import { expect } from 'chai';
import sinon from 'sinon';

import NextHandler from '@/runtime/lib/Handlers/next';

describe('Next unit tests', () => {
  const nextHandler = NextHandler();

  describe('canHandle', () => {
    it('false', () => {
      expect(nextHandler.canHandle({} as any, null as any, null as any, null as any)).to.eql(false);
    });

    it('true', () => {
      expect(
        nextHandler.canHandle({ nextId: 'next-id' } as any, null as any, null as any, null as any)
      ).to.eql(true);
    });
  });

  describe('handle', () => {
    it('returns nextId', () => {
      const nextId = 'next-id';
      const runtime = {
        trace: { debug: sinon.stub() },
      };
      expect(
        nextHandler.handle({ nextId } as any, runtime as any, null as any, null as any)
      ).to.eql(nextId);
      expect(runtime.trace.debug.args).to.eql([
        ['could not handle step - redirecting to the next step'],
      ]);
    });

    it('returns null', () => {
      const runtime = {
        trace: { debug: sinon.stub() },
      };
      expect(nextHandler.handle({} as any, runtime as any, null as any, null as any)).to.eql(null);
      expect(runtime.trace.debug.args).to.eql([
        ['could not handle step - redirecting to the next step'],
      ]);
    });
  });
});
