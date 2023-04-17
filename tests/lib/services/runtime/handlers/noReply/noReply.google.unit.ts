import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { NoReplyGoogleHandler } from '@/lib/services/runtime/handlers/noReply/noReply.google';
import { StorageType } from '@/lib/services/runtime/types';

const GlobalNoReply = { prompt: { voice: 'Google', content: 'no answer' } };

describe('noInput handler unit tests', () => {
  describe('canHandle', () => {
    it('false', () => {
      expect(NoReplyGoogleHandler().canHandle({ getRequest: sinon.stub().returns(null) } as any)).to.eql(false);
      expect(NoReplyGoogleHandler().canHandle({ getRequest: sinon.stub().returns({}) } as any)).to.eql(false);
      expect(
        NoReplyGoogleHandler().canHandle({
          getRequest: sinon.stub().returns({ payload: { intent: { name: 'other intent' } } }),
        } as any)
      ).to.eql(false);
    });
    it('true', () => {
      expect(
        NoReplyGoogleHandler().canHandle({
          getRequest: sinon.stub().returns({ payload: { intent: { name: 'actions.intent.NO_INPUT_1' } } }),
        } as any)
      ).to.eql(true);
      expect(
        NoReplyGoogleHandler().canHandle({
          getRequest: sinon.stub().returns({ payload: { intent: { name: 'actions.intent.NO_INPUT_FINAL' } } }),
        } as any)
      ).to.eql(true);
    });
  });

  describe('handle', () => {
    it('next id', () => {
      const node = {
        id: 'node-id',
        noReply: {
          nodeID: 'next-id',
          prompts: ['a', 'b'],
        },
      };
      const runtime = {
        storage: {
          delete: sinon.stub(),
          set: sinon.stub(),
          get: sinon.stub().returns(2),
        },
        trace: {
          addTrace: sinon.stub(),
        },
        debugLogging: { recordStepLog: sinon.stub() },
      };
      const variables = {
        get: sinon.stub(),
        set: sinon.stub(),
        getState: sinon.stub().returns({}),
      };
      const noInputHandler = NoReplyGoogleHandler();
      expect(noInputHandler.handle(node as any, runtime as any, variables as any)).to.eql(node.noReply.nodeID);
    });

    it('with old reprompt format', () => {
      const node = {
        id: 'node-id',
        reprompt: 'the counter is {counter}',
      };
      const runtime = {
        storage: {
          produce: sinon.stub(),
          set: sinon.stub(),
          get: sinon.stub().onFirstCall().returns(0).onSecondCall().returns(''),
        },
        trace: {
          addTrace: sinon.stub(),
        },
        debugLogging: { recordStepLog: sinon.stub() },
      };
      const variables = {
        get: sinon.stub(),
        set: sinon.stub(),
        getState: sinon.stub().returns({ counter: 5.2345 }),
      };

      const noInputHandler = NoReplyGoogleHandler();
      expect(noInputHandler.handle(node as any, runtime as any, variables as any)).to.eql(node.id);
      expect(runtime.storage.set.args).to.eql([[StorageType.NO_REPLIES_COUNTER, 1]]);
      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: 'path',
            payload: {
              path: 'reprompt',
            },
          },
        ],
        [
          {
            type: 'speak',
            payload: {
              message: 'the counter is 5.23',
              type: 'message',
            },
          },
        ],
        [
          {
            type: 'no-reply',
            payload: {
              timeout: 10,
            },
          },
        ],
      ]);
    });

    it('with new noReply format', () => {
      const node = {
        id: 'node-id',
        noReply: {
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
        get: sinon.stub(),
        set: sinon.stub(),
        getState: sinon.stub().returns({ counter: 5.2345 }),
      };

      const noInputHandler = NoReplyGoogleHandler();
      expect(noInputHandler.handle(node as any, runtime as any, variables as any)).to.eql(node.id);

      expect(runtime.storage.set.args).to.eql([[StorageType.NO_REPLIES_COUNTER, 1]]);

      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: 'path',
            payload: {
              path: 'reprompt',
            },
          },
        ],
        [
          {
            type: 'speak',
            payload: {
              message: 'the counter is 5.23',
              type: 'message',
            },
          },
        ],
        [
          {
            type: 'no-reply',
            payload: {
              timeout: 10,
            },
          },
        ],
      ]);
    });

    it('with global noReply', () => {
      const node = {
        id: 'node-id',
        noReply: {
          prompts: [],
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
        version: {
          platformData: {
            settings: {
              globalNoReply: GlobalNoReply,
            },
          },
        },
      };
      const variables = {
        get: sinon.stub(),
        set: sinon.stub(),
        getState: sinon.stub().returns({}),
      };

      const noInputHandler = NoReplyGoogleHandler();
      expect(noInputHandler.handle(node as any, runtime as any, variables as any)).to.eql(node.id);

      expect(runtime.storage.set.args).to.eql([[StorageType.NO_REPLIES_COUNTER, 1]]);
      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: 'path',
            payload: {
              path: 'reprompt',
            },
          },
        ],
        [
          {
            type: 'speak',
            payload: {
              message: 'no answer',
              type: 'message',
            },
          },
        ],
        [
          {
            type: 'no-reply',
            payload: {
              timeout: 10,
            },
          },
        ],
      ]);
    });

    it('without noReply', () => {
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
        get: sinon.stub(),
        set: sinon.stub(),
        getState: sinon.stub().returns({}),
      };

      const noInputHandler = NoReplyGoogleHandler();
      expect(noInputHandler.handle(node as any, runtime as any, variables as any)).to.eql(null);
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
        get: sinon.stub(),
        set: sinon.stub(),
        getState: sinon.stub().returns({}),
      };

      const noInputHandler = NoReplyGoogleHandler();
      expect(noInputHandler.handle(node as any, runtime as any, variables as any)).to.eql(null);
    });

    it('with noReply randomized', () => {
      const node = {
        id: 'node-id',
        noReply: {
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
        get: sinon.stub(),
        set: sinon.stub(),
        getState: sinon.stub().returns({}),
      };

      const noInputHandler = NoReplyGoogleHandler();
      expect(noInputHandler.handle(node as any, runtime as any, variables as any)).to.eql(node.id);

      expect(node.noReply.prompts.includes(runtime.trace.addTrace.args[1][0].payload.message)).to.eql(true);
    });
  });
});
