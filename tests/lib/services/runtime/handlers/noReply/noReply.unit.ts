import { expect } from 'chai';
import sinon from 'sinon';

import { NoReplyHandler } from '@/lib/services/runtime/handlers/noReply/noReply';
import { StorageType } from '@/lib/services/runtime/types';
import { EMPTY_AUDIO_STRING, outputTrace } from '@/lib/services/runtime/utils';
import DebugLogging from '@/runtime/lib/Runtime/DebugLogging';
import { getISO8601Timestamp } from '@/runtime/lib/Runtime/DebugLogging/utils';

const RepromptPathTrace = { type: 'path', payload: { path: 'reprompt' } };
const NoReplyPathTrace = { type: 'path', payload: { path: 'choice:noReply' } };
const GlobalNoReply = { prompt: { content: 'Still there?' } };

describe('noReply handler unit tests', () => {
  describe('handle', () => {
    it('with noReply', () => {
      const node = {
        id: 'node-id',
        noReply: { prompts: ['the counter is {counter}'] },
      };
      const runtime = {
        storage: {
          produce: sinon.stub(),
          get: sinon.stub().onFirstCall().returns(undefined).onSecondCall().returns(1),
          set: sinon.stub(),
          delete: sinon.stub(),
        },
        trace: {
          addTrace: sinon.stub(),
        },
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
      const variables = {
        getState: sinon.stub().returns({ counter: 5.2345 }),
      };

      const noMatchHandler = NoReplyHandler({
        outputTrace,
        addButtonsIfExists: sinon.stub(),
        addNoReplyTimeoutIfExists: sinon.stub(),
      });
      expect(noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql(node.id);
      expect(runtime.trace.addTrace.args).to.eql([
        [RepromptPathTrace],
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
            type: 'log',
            payload: {
              kind: 'step.speak',
              level: 'info',
              message: {
                componentName: 'speak',
                stepID: 'node-id',
                text: 'the counter is 5.23',
              },
              timestamp: getISO8601Timestamp(),
            },
          },
        ],
      ]);
      expect(runtime.storage.set.args).to.eql([[StorageType.NO_REPLIES_COUNTER, 1]]);
    });

    it('without noReply ', () => {
      const node = {
        id: 'id',
      };
      const runtime = {
        storage: {
          produce: sinon.stub(),
          get: sinon.stub().returns(0),
          delete: sinon.stub(),
          set: sinon.stub(),
        },
        trace: {
          addTrace: sinon.stub(),
        },
      };
      const variables = {
        getState: sinon.stub().returns({}),
      };

      const noMatchHandler = NoReplyHandler({
        outputTrace,
        addButtonsIfExists: sinon.stub(),
        addNoReplyTimeoutIfExists: sinon.stub(),
      });
      expect(noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql(null);
    });

    it('without noReply prompts', () => {
      const node = {
        id: 'id',
        noReply: { nodeID: 'node-id' },
      };
      const runtime = {
        storage: {
          produce: sinon.stub(),
          get: sinon.stub().returns(0),
          delete: sinon.stub(),
          set: sinon.stub(),
        },
        trace: {
          addTrace: sinon.stub(),
        },
      };
      const variables = {
        getState: sinon.stub().returns({}),
      };

      const noMatchHandler = NoReplyHandler({
        outputTrace,
        addButtonsIfExists: sinon.stub(),
        addNoReplyTimeoutIfExists: sinon.stub(),
      });
      expect(noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql('node-id');
      expect(runtime.trace.addTrace.args).to.eql([[NoReplyPathTrace]]);
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
          produce: sinon.stub(),
          get: sinon.stub().onFirstCall().returns(0).onSecondCall().returns(1),
          set: sinon.stub(),
          delete: sinon.stub(),
        },
        trace: {
          addTrace: sinon.stub(),
        },
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
      const variables = {
        getState: sinon.stub().returns({}),
      };

      const noMatchHandler = NoReplyHandler({
        outputTrace,
        addButtonsIfExists: sinon.stub(),
        addNoReplyTimeoutIfExists: sinon.stub(),
      });
      expect(noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql(node.id);
      expect(node.noReply.prompts.includes(runtime.trace.addTrace.args[1][0].payload.message)).to.eql(true);
    });

    it('with noReply null speak string', () => {
      const NON_NULL_STRING = 'Josh was here';
      const node = {
        id: 'node-id',
        noReply: {
          prompts: [null, NON_NULL_STRING],
        },
      };
      const runtime = {
        storage: {
          produce: sinon.stub(),
          get: sinon.stub().onFirstCall().returns(0).onSecondCall().returns(1),
          set: sinon.stub(),
          delete: sinon.stub(),
        },
        trace: {
          addTrace: sinon.stub(),
        },
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
      const variables = {
        getState: sinon.stub().returns({}),
      };

      const noMatchHandler = NoReplyHandler({
        outputTrace,
        addButtonsIfExists: sinon.stub(),
        addNoReplyTimeoutIfExists: sinon.stub(),
      });
      expect(noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql(node.id);
      expect(runtime.trace.addTrace.args[1][0].payload.message).to.eql(NON_NULL_STRING);
    });

    it('with noReply empty audio', () => {
      const NON_NULL_STRING = 'Josh was here';
      const node = {
        id: 'node-id',
        noReply: {
          prompts: [EMPTY_AUDIO_STRING, NON_NULL_STRING],
        },
      };
      const runtime = {
        storage: {
          produce: sinon.stub(),
          get: sinon.stub().onFirstCall().returns(0).onSecondCall().returns(1),
          set: sinon.stub(),
          delete: sinon.stub(),
        },
        trace: {
          addTrace: sinon.stub(),
        },
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
      const variables = {
        getState: sinon.stub().returns({}),
      };

      const noMatchHandler = NoReplyHandler({
        outputTrace,
        addButtonsIfExists: sinon.stub(),
        addNoReplyTimeoutIfExists: sinon.stub(),
      });
      expect(noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql(node.id);
      expect(runtime.trace.addTrace.args[1][0].payload.message).to.eql(NON_NULL_STRING);
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
          produce: sinon.stub(),
          get: sinon.stub().onFirstCall().returns(0).onSecondCall().returns(1),
          set: sinon.stub(),
          delete: sinon.stub(),
        },
        trace: {
          addTrace: sinon.stub(),
        },
        version: {
          platformData: {
            settings: {
              globalNoReply: GlobalNoReply,
            },
          },
        },
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
      const variables = {
        getState: sinon.stub().returns({}),
      };

      const noMatchHandler = NoReplyHandler({
        outputTrace,
        addButtonsIfExists: sinon.stub(),
        addNoReplyTimeoutIfExists: sinon.stub(),
      });
      expect(noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql(node.id);
      expect(runtime.trace.addTrace.args[1][0].payload.message).to.eql(GlobalNoReply.prompt.content);
    });
  });

  describe('handle deprecated', () => {
    it('with reprompt', () => {
      const node = {
        id: 'node-id',
        reprompt: 'the counter is {counter}',
      };
      const runtime = {
        storage: {
          produce: sinon.stub(),
          get: sinon.stub().onFirstCall().returns(0).onSecondCall().returns(1),
          set: sinon.stub(),
          delete: sinon.stub(),
        },
        trace: {
          addTrace: sinon.stub(),
        },
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
      const variables = {
        getState: sinon.stub().returns({ counter: 5.2345 }),
      };

      const noMatchHandler = NoReplyHandler({
        outputTrace,
        addButtonsIfExists: sinon.stub(),
        addNoReplyTimeoutIfExists: sinon.stub(),
      });
      expect(noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql(node.id);
      expect(runtime.trace.addTrace.args).to.eql([
        [RepromptPathTrace],
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
            type: 'log',
            payload: {
              kind: 'step.speak',
              level: 'info',
              message: {
                componentName: 'speak',
                stepID: 'node-id',
                text: 'the counter is 5.23',
              },
              timestamp: getISO8601Timestamp(),
            },
          },
        ],
      ]);
    });
  });
});
