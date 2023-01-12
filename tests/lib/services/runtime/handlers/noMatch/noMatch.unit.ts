import { BaseNode } from '@voiceflow/base-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { NoMatchHandler } from '@/lib/services/runtime/handlers/noMatch';
import { StorageType } from '@/lib/services/runtime/types';
import { EMPTY_AUDIO_STRING, outputTrace } from '@/lib/services/runtime/utils';
import DebugLogging from '@/runtime/lib/Runtime/DebugLogging';
import { getISO8601Timestamp } from '@/runtime/lib/Runtime/DebugLogging/utils';

const RepromptPathTrace = { type: 'path', payload: { path: 'reprompt' } };
const NoMatchPathTrace = { type: 'path', payload: { path: 'choice:else' } };

const GlobalNoMatch = { prompt: { content: 'Sorry, could not understand what you said' } };

describe('noMatch handler unit tests', async () => {
  describe('handle', async () => {
    it('with noMatch', async () => {
      const node = {
        id: 'node-id',
        noMatch: { prompts: ['the counter is {counter}'] },
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

      const noMatchHandler = NoMatchHandler({
        outputTrace,
        addButtonsIfExists: sinon.stub(),
        addNoReplyTimeoutIfExists: sinon.stub(),
      });
      expect(await noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql(node.id);
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
      expect(runtime.storage.set.args).to.eql([[StorageType.NO_MATCHES_COUNTER, 1]]);
    });

    it('without noMatch ', async () => {
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
        version: {
          platformData: {
            settings: {
              globalNoMatch: { prompt: { content: [{ text: '' }] } },
            },
          },
        },
      };
      const variables = {
        getState: sinon.stub().returns({}),
      };

      const noMatchHandler = NoMatchHandler({
        outputTrace,
        addButtonsIfExists: sinon.stub(),
        addNoReplyTimeoutIfExists: sinon.stub(),
      });
      expect(await noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql(null);
    });

    it('without noMatch prompts', async () => {
      const node = {
        id: 'id',
        noMatch: { nodeID: 'node-id' },
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

      const noMatchHandler = NoMatchHandler({
        outputTrace,
        addButtonsIfExists: sinon.stub(),
        addNoReplyTimeoutIfExists: sinon.stub(),
      });
      expect(await noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql('node-id');
      expect(runtime.trace.addTrace.args).to.eql([[NoMatchPathTrace]]);
    });

    it('with buttons', async () => {
      const node = {
        id: 'node-id',
        buttons: [
          { intent: 'address_intent' },
          { event: { type: BaseNode.Utils.EventType.INTENT, intent: 'phone_number_intent' } },
        ],
        noMatch: { nodeID: undefined, prompts: ['the counter is {counter}'], randomize: false },
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

      const addButtonsIfExists = sinon.stub();

      const noMatchHandler = NoMatchHandler({
        outputTrace,
        addButtonsIfExists,
        addNoReplyTimeoutIfExists: sinon.stub(),
      });
      expect(await noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql('node-id');
      expect(addButtonsIfExists.args).to.eql([[node, runtime, variables]]);
      expect(runtime.trace.addTrace.args).to.eql([
        [RepromptPathTrace],
        [
          {
            type: 'speak',
            payload: {
              message: 'the counter is {counter}',
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
                text: 'the counter is {counter}',
              },
              timestamp: getISO8601Timestamp(),
            },
          },
        ],
      ]);
    });

    it('with noMatch and path', async () => {
      const node = {
        id: 'node-id',
        buttons: [],
        noMatch: { nodeID: 'next-id', prompts: ['the counter is {counter}'], randomize: false },
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

      const addButtonsIfExists = sinon.stub();

      const noMatchHandler = NoMatchHandler({
        outputTrace,
        addButtonsIfExists,
        addNoReplyTimeoutIfExists: sinon.stub(),
      });
      expect(await noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql('node-id');

      expect(runtime.trace.addTrace.args).to.eql([
        [RepromptPathTrace],
        [
          {
            type: 'speak',
            payload: {
              message: 'the counter is {counter}',
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
                text: 'the counter is {counter}',
              },
              timestamp: getISO8601Timestamp(),
            },
          },
        ],
      ]);
    });

    it('with noMatch randomized', async () => {
      const node = {
        id: 'node-id',
        noMatch: {
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

      const noMatchHandler = NoMatchHandler({
        outputTrace,
        addButtonsIfExists: sinon.stub(),
        addNoReplyTimeoutIfExists: sinon.stub(),
      });
      expect(await noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql(node.id);
      expect(node.noMatch.prompts.includes(runtime.trace.addTrace.args[1][0].payload.message)).to.eql(true);
    });

    it('with noMatch null speak string', async () => {
      const NON_NULL_STRING = 'Josh was here';
      const node = {
        id: 'node-id',
        noMatch: {
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

      const noMatchHandler = NoMatchHandler({
        outputTrace,
        addButtonsIfExists: sinon.stub(),
        addNoReplyTimeoutIfExists: sinon.stub(),
      });
      expect(await noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql(node.id);
      expect(runtime.trace.addTrace.args[1][0].payload.message).to.eql(NON_NULL_STRING);
    });

    it('with noMatch empty audio', async () => {
      const NON_NULL_STRING = 'Josh was here';
      const node = {
        id: 'node-id',
        noMatch: {
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

      const noMatchHandler = NoMatchHandler({
        outputTrace,
        addButtonsIfExists: sinon.stub(),
        addNoReplyTimeoutIfExists: sinon.stub(),
      });
      expect(await noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql(node.id);
      expect(runtime.trace.addTrace.args[1][0].payload.message).to.eql(NON_NULL_STRING);
    });

    it('with global noMatch', async () => {
      const node = {
        id: 'node-id',
        noMatch: {
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
              globalNoMatch: GlobalNoMatch,
            },
          },
        },
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
      const variables = {
        getState: sinon.stub().returns({}),
      };

      const noMatchHandler = NoMatchHandler({
        outputTrace,
        addButtonsIfExists: sinon.stub(),
        addNoReplyTimeoutIfExists: sinon.stub(),
      });
      expect(await noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql(node.id);
      expect(runtime.trace.addTrace.args[1][0].payload.message).to.eql(GlobalNoMatch.prompt.content);
    });

    it('with global noMatch and default message', async () => {
      const node = {
        id: 'node-id',
        noMatch: {
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
              globalNoMatch: { prompt: undefined },
            },
          },
        },
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
      const variables = {
        getState: sinon.stub().returns({}),
      };

      const noMatchHandler = NoMatchHandler({
        outputTrace,
        addButtonsIfExists: sinon.stub(),
        addNoReplyTimeoutIfExists: sinon.stub(),
      });
      expect(await noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql(node.id);
      expect(runtime.trace.addTrace.args[1][0].payload.message).to.eql(
        VoiceflowConstants.defaultMessages.globalNoMatch
      );
    });
  });

  describe('handle deprecated', async () => {
    it('with noMatch', async () => {
      const node = {
        id: 'node-id',
        noMatches: ['the counter is {counter}'],
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

      const noMatchHandler = NoMatchHandler({
        outputTrace,
        addButtonsIfExists: sinon.stub(),
        addNoReplyTimeoutIfExists: sinon.stub(),
      });
      expect(await noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql(node.id);
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

    it('with noMatch randomized', async () => {
      const node = {
        id: 'node-id',
        noMatches: ['A', 'B', 'C'],
        randomize: true,
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

      const noMatchHandler = NoMatchHandler({
        outputTrace,
        addButtonsIfExists: sinon.stub(),
        addNoReplyTimeoutIfExists: sinon.stub(),
      });
      expect(await noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql(node.id);
      expect(node.noMatches.includes(runtime.trace.addTrace.args[1][0].payload.message)).to.eql(true);
    });

    it('with noMatch null speak string', async () => {
      const NON_NULL_STRING = 'Josh was here';
      const node = {
        id: 'node-id',
        noMatches: [null, NON_NULL_STRING],
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

      const noMatchHandler = NoMatchHandler({
        outputTrace,
        addButtonsIfExists: sinon.stub(),
        addNoReplyTimeoutIfExists: sinon.stub(),
      });
      expect(await noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql(node.id);
      expect(runtime.trace.addTrace.args[1][0].payload.message).to.eql(NON_NULL_STRING);
    });

    it('with noMatch empty audio', async () => {
      const NON_NULL_STRING = 'Josh was here';
      const node = {
        id: 'node-id',
        noMatches: [EMPTY_AUDIO_STRING, NON_NULL_STRING],
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

      const noMatchHandler = NoMatchHandler({
        outputTrace,
        addButtonsIfExists: sinon.stub(),
        addNoReplyTimeoutIfExists: sinon.stub(),
      });
      expect(await noMatchHandler.handle(node as any, runtime as any, variables as any)).to.eql(node.id);
      expect(runtime.trace.addTrace.args[1][0].payload.message).to.eql(NON_NULL_STRING);
    });
  });
});
