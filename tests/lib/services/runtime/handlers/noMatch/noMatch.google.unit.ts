import { expect } from 'chai';
import sinon from 'sinon';

import { NoMatchGoogleHandler } from '@/lib/services/runtime/handlers/noMatch/noMatch.google';
import { StorageType } from '@/lib/services/runtime/types';

describe('noMatch handler unit tests', () => {
  describe('handle', () => {
    it('next id', () => {
      const node = {
        id: 'node-id',
        noMatch: {
          nodeID: 'next-id',
          prompts: ['a', 'b'],
        },
      };
      const runtime = {
        storage: {
          delete: sinon.stub(),
          get: sinon.stub().returns(2),
        },
      };

      const noMatchHandler = NoMatchGoogleHandler();
      expect(noMatchHandler.handle(node as any, runtime as any, {} as any)).to.eql(node.noMatch.nodeID);
    });

    it('with old noMatch format', () => {
      const node = {
        id: 'node-id',
        noMatches: ['the counter is {counter}'],
      };
      const runtime = {
        storage: {
          produce: sinon.stub(),
          set: sinon.stub(),
          get: sinon.stub().returns(0),
        },
        trace: {
          addTrace: sinon.stub(),
        },
        debugLogging: { recordStepLog: sinon.stub() },
      };
      const variables = {
        getState: sinon.stub().returns({ counter: 5.2345 }),
      };

      const noMatchHandler = NoMatchGoogleHandler();
      expect(noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql(node.id);

      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: 'speak',
            payload: {
              message: 'the counter is 5.23',
              type: 'message',
            },
          },
        ],
      ]);
      expect(runtime.storage.set.args).to.eql([[StorageType.NO_MATCHES_COUNTER, 1]]);
    });

    it('with new noMatch format', () => {
      const node = {
        id: 'node-id',
        noMatch: {
          prompts: ['the counter is {counter}'],
        },
      };
      const runtime = {
        storage: {
          set: sinon.stub(),
          produce: sinon.stub(),
          get: sinon.stub().returns(null),
        },
        trace: {
          addTrace: sinon.stub(),
        },
        debugLogging: { recordStepLog: sinon.stub() },
      };
      const variables = {
        getState: sinon.stub().returns({ counter: 5.2345 }),
      };

      const noMatchHandler = NoMatchGoogleHandler();
      expect(noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql(node.id);

      expect(runtime.storage.set.args).to.eql([[StorageType.NO_MATCHES_COUNTER, 1]]);

      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: 'speak',
            payload: {
              message: 'the counter is 5.23',
              type: 'message',
            },
          },
        ],
      ]);
    });

    it('without noMatch', () => {
      const node = {
        id: 'node-id',
      };
      const runtime = {
        storage: {
          set: sinon.stub(),
          delete: sinon.stub(),
          get: sinon.stub(),
        },
        trace: {
          addTrace: sinon.stub(),
        },
        debugLogging: { recordStepLog: sinon.stub() },
      };
      const variables = {
        getState: sinon.stub().returns({}),
      };

      const noMatchHandler = NoMatchGoogleHandler();
      expect(noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql(null);
    });

    it('with choices', () => {
      const node = {
        id: 'node-id',
        interactions: [{ intent: 'address_intent' }, { intent: 'phone_number_intent' }],
      };
      const runtime = {
        storage: {
          set: sinon.stub(),
          delete: sinon.stub(),
          get: sinon.stub().returns(0),
        },
        trace: {
          addTrace: sinon.stub(),
        },
        debugLogging: { recordStepLog: sinon.stub() },
      };
      const variables = {
        getState: sinon.stub().returns({}),
      };

      const noMatchHandler = NoMatchGoogleHandler();
      expect(noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql(null);
    });

    it('with noMatch randomized', () => {
      const node = {
        id: 'node-id',
        noMatch: {
          prompts: ['A', 'B', 'C'],
          randomize: true,
        },
      };
      const runtime = {
        storage: {
          set: sinon.stub(),
          produce: sinon.stub(),
          get: sinon.stub().returns(0),
        },
        trace: {
          addTrace: sinon.stub(),
        },
        debugLogging: { recordStepLog: sinon.stub() },
      };
      const variables = {
        getState: sinon.stub().returns({}),
      };

      const noMatchHandler = NoMatchGoogleHandler();
      expect(noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql(node.id);

      expect(node.noMatch.prompts.includes(runtime.trace.addTrace.args[0][0].payload.message)).to.eql(true);
    });
  });
});
