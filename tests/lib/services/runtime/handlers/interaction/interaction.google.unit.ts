import { BaseNode, BaseRequest } from '@voiceflow/base-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { InteractionGoogleHandler } from '@/lib/services/runtime/handlers/interaction/interaction.google';
import { StorageType, TurnType } from '@/lib/services/runtime/types';
import { Action } from '@/runtime';

describe('interaction handler unit tests', async () => {
  afterEach(() => sinon.restore());

  describe('canHandle', () => {
    it('false', async () => {
      expect(InteractionGoogleHandler(null as any).canHandle({} as any, null as any, null as any, null as any)).to.eql(
        false
      );
    });

    it('true', async () => {
      expect(
        InteractionGoogleHandler(null as any).canHandle(
          { interactions: { foo: 'bar' }, platform: VoiceflowConstants.PlatformType.GOOGLE } as any,
          null as any,
          null as any,
          null as any
        )
      ).to.eql(true);
    });
  });

  describe('handle', () => {
    it('request type not intent', () => {
      const utils = {
        addRepromptIfExists: sinon.stub(),
        addButtonsIfExists: sinon.stub(),
        addNoReplyTimeoutIfExists: sinon.stub(),
      };

      const captureHandler = InteractionGoogleHandler(utils as any);

      const block = { id: 'block-id' };
      const runtime = {
        trace: { addTrace: sinon.stub() },
        storage: { delete: sinon.stub() },
        getRequest: sinon.stub().returns({ type: 'random' }),
        getAction: sinon.stub().returns(Action.RUNNING),
      };
      const variables = { foo: 'bar' };

      expect(captureHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(block.id);
      expect(utils.addRepromptIfExists.args).to.eql([[block, runtime, variables]]);
      expect(utils.addButtonsIfExists.args).to.eql([[block, runtime, variables]]);
      expect(runtime.storage.delete.args).to.eql([
        [TurnType.REPROMPT],
        [StorageType.NO_MATCHES_COUNTER],
        [StorageType.NO_REPLIES_COUNTER],
      ]);
    });

    describe('request type is intent', () => {
      describe('button match', () => {
        it('PATH', async () => {
          const buttonName = 'button_name';
          const utils = {};

          const interactionHandler = InteractionGoogleHandler(utils as any);

          const block = {
            id: 'block-id',
            interactions: [
              { event: { intent: '' } },
              { event: { name: buttonName }, nextId: 'next-id' },
              { event: { intent: '' } },
            ],
          };
          const request = { type: BaseRequest.RequestType.INTENT, payload: { label: buttonName } };
          const runtime = {
            trace: { addTrace: sinon.stub() },
            storage: { delete: sinon.stub() },
            getRequest: sinon.stub().returns(request),
            getAction: sinon.stub().returns(Action.REQUEST),
          };
          const variablesState = { foo: 'bar' };
          const variables = { getState: sinon.stub().returns(variablesState) };

          expect(interactionHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(
            block.interactions[1].nextId
          );
        });

        it('INTENT', async () => {
          const intentName = 'random-intent';

          const output = 'next-id';
          const buttonName = 'button_name';
          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(true),
              handle: sinon.stub().returns(output),
            },
          };

          const interactionHandler = InteractionGoogleHandler(utils as any);

          const block = {
            id: 'block-id',
            interactions: [
              { event: { intent: '' } },
              { event: { type: BaseRequest.RequestType.INTENT, intent: intentName } },
              { event: { intent: '' } },
            ],
          };
          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: { name: buttonName } } };
          const runtime = {
            trace: { addTrace: sinon.stub() },
            storage: { delete: sinon.stub() },
            getRequest: sinon.stub().returns(request),
            getAction: sinon.stub().returns(Action.REQUEST),
          };
          const variablesState = { foo: 'bar' };
          const variables = { getState: sinon.stub().returns(variablesState) };

          expect(interactionHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(output);
        });
      });

      it('command handler can handle', () => {
        const output = 'bar';

        const utils = {
          replaceIDVariables: sinon.stub().returns(''),
          commandHandler: {
            canHandle: sinon.stub().returns(true),
            handle: sinon.stub().returns(output),
          },
        };

        const interactionHandler = InteractionGoogleHandler(utils as any);

        const block = { id: 'block-id', interactions: [], buttons: [{ name: 'button-name' }] };
        const runtime = {
          trace: { addTrace: sinon.stub() },
          storage: { delete: sinon.stub() },
          getRequest: sinon.stub().returns({ type: BaseRequest.RequestType.INTENT, payload: {} }),
          getAction: sinon.stub().returns(Action.REQUEST),
        };
        const variables = { getState: sinon.stub().returns({ foo: 'bar' }) };

        expect(interactionHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(output);
        expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
        expect(utils.commandHandler.handle.args).to.eql([[runtime, variables]]);
      });

      describe('command cant handle', () => {
        it('no choice', () => {
          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noMatchHandler: {
              handle: sinon.stub().returns(null),
            },
            noReplyHandler: {
              canHandle: sinon.stub().returns(false),
            },
          };

          const interactionHandler = InteractionGoogleHandler(utils as any);

          const block = {
            id: 'block-id',
            interactions: [
              { event: { intent: 'intent1', type: BaseRequest.RequestType.INTENT } },
              { event: { intent: 'intent2', type: BaseRequest.RequestType.INTENT } },
            ],
          };
          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: 'random-intent' } };
          const runtime = {
            trace: { addTrace: sinon.stub() },
            storage: { delete: sinon.stub() },
            getRequest: sinon.stub().returns(request),
            getAction: sinon.stub().returns(Action.REQUEST),
          };
          const variables = { foo: 'bar' };

          expect(interactionHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(null);
        });

        it('no choice with elseId', () => {
          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noMatchHandler: {
              handle: sinon.stub().returns('else-id'),
            },
            noReplyHandler: {
              canHandle: sinon.stub().returns(false),
            },
          };

          const interactionHandler = InteractionGoogleHandler(utils as any);

          const block = {
            id: 'block-id',
            interactions: [
              { event: { intent: 'intent1', type: BaseRequest.RequestType.INTENT } },
              { event: { intent: 'intent2', type: BaseRequest.RequestType.INTENT } },
            ],
          };
          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: 'random-intent' } };
          const runtime = {
            trace: { addTrace: sinon.stub() },
            storage: { delete: sinon.stub() },
            getRequest: sinon.stub().returns(request),
            getAction: sinon.stub().returns(Action.REQUEST),
          };
          const variables = { foo: 'bar' };

          expect(interactionHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(
            'else-id'
          );
        });

        it('no choice with noMatches', () => {
          const nextId = 'next-id';
          const noMatches = ['speak1', 'speak2', 'speak3'];

          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noMatchHandler: {
              canHandle: sinon.stub().returns(true),
              handle: sinon.stub().returns(nextId),
            },
            noReplyHandler: {
              canHandle: sinon.stub().returns(false),
            },
          };

          const interactionHandler = InteractionGoogleHandler(utils as any);

          const block = {
            id: 'block-id',
            interactions: [
              { event: { intent: 'intent1', type: BaseRequest.RequestType.INTENT } },
              { event: { intent: 'intent2', type: BaseRequest.RequestType.INTENT } },
            ],
            noMatches,
          };
          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: { name: 'random-intent' } } };
          const runtime = {
            trace: { addTrace: sinon.stub() },
            storage: { delete: sinon.stub() },
            getRequest: sinon.stub().returns(request),
            getAction: sinon.stub().returns(Action.REQUEST),
          };
          const variables = { foo: 'bar' };

          expect(interactionHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(nextId);
          expect(utils.noMatchHandler.handle.args).to.eql([[block, runtime, variables]]);
        });

        it('choice without mappings', () => {
          const intentName = 'random-intent';

          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noMatchHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noReplyHandler: {
              canHandle: sinon.stub().returns(false),
            },
          };

          const interactionHandler = InteractionGoogleHandler(utils as any);

          const block = {
            id: 'block-id',
            elseId: 'else-id',
            interactions: [
              { event: { intent: 'random-intent', type: BaseRequest.RequestType.INTENT }, nextId: 'id-one' },
            ],
          };
          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: { name: intentName } } };
          const runtime = {
            trace: { addTrace: sinon.stub() },
            storage: { delete: sinon.stub() },
            getRequest: sinon.stub().returns(request),
            getAction: sinon.stub().returns(Action.REQUEST),
          };
          const variables = { foo: 'bar' };

          expect(interactionHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(
            block.interactions[0].nextId
          );
        });

        it('choice without mappings but nextIdIndex', () => {
          const intentName = 'random-intent';

          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noMatchHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noReplyHandler: {
              canHandle: sinon.stub().returns(false),
            },
          };

          const interactionHandler = InteractionGoogleHandler(utils as any);

          const block = {
            id: 'block-id',
            elseId: 'else-id',
            interactions: [
              { event: { intent: 'random-intent', type: BaseRequest.RequestType.INTENT }, nextId: 'id-two' },
            ],
          };
          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: { name: intentName } } };
          const runtime = {
            trace: { addTrace: sinon.stub() },
            storage: { delete: sinon.stub() },
            getRequest: sinon.stub().returns(request),
            getAction: sinon.stub().returns(Action.REQUEST),
          };
          const variables = { foo: 'bar' };

          expect(interactionHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(
            block.interactions[0].nextId
          );
        });

        it('goto choice', () => {
          const intentName = 'random-intent';

          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noMatchHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noReplyHandler: {
              canHandle: sinon.stub().returns(false),
            },
          };

          const interactionHandler = InteractionGoogleHandler(utils as any);

          const block = {
            id: 'block-id',
            elseId: 'else-id',
            interactions: [
              {
                event: { intent: 'random-intent', type: BaseRequest.RequestType.INTENT },
                goTo: { intentName: 'go-to-intent' },
              },
            ],
          };
          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: { name: intentName } } };
          const runtime = {
            trace: { addTrace: sinon.stub() },
            storage: { delete: sinon.stub() },
            getRequest: sinon.stub().returns(request),
            getAction: sinon.stub().returns(Action.REQUEST),
          };
          const variables = { foo: 'bar' };

          expect(interactionHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(
            block.id
          );
          expect(runtime.trace.addTrace.args).to.eql([
            [
              {
                payload: {
                  request: {
                    payload: {
                      entities: [],
                      intent: { name: block.interactions[0].goTo.intentName },
                      query: '',
                    },
                    requiredEntities: undefined,
                    type: BaseRequest.RequestType.INTENT,
                  },
                },
                type: BaseNode.Utils.TraceType.GOTO,
              },
            ],
          ]);
        });

        it('choice with mappings', () => {
          const intentName = 'random-intent';
          const mappedEntities = { slot1: 'slot-1' };

          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noMatchHandler: {
              canHandle: sinon.stub().returns(false),
            },
            mapEntities: sinon.stub().returns(mappedEntities),
            noReplyHandler: {
              canHandle: sinon.stub().returns(false),
            },
          };

          const interactionHandler = InteractionGoogleHandler(utils as any);

          const block = {
            id: 'block-id',
            elseId: 'else-id',
            interactions: [
              {
                event: { intent: 'random-intent', type: BaseRequest.RequestType.INTENT, mappings: { foo: 'bar' } },
                nextId: 'id-one',
              },
            ],
          };
          const request = {
            type: BaseRequest.RequestType.INTENT,
            payload: { intent: { name: intentName }, entities: [{ name: 'foo2', value: 'bar2' }] },
          };
          const runtime = {
            trace: { addTrace: sinon.stub() },
            storage: { delete: sinon.stub() },
            getRequest: sinon.stub().returns(request),
            getAction: sinon.stub().returns(Action.REQUEST),
          };
          const variables = { merge: sinon.stub() };

          expect(interactionHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(
            block.interactions[0].nextId
          );
          expect(utils.mapEntities.args).to.eql([[block.interactions[0].event.mappings, request.payload.entities]]);
          expect(variables.merge.args).to.eql([[mappedEntities]]);
        });

        // eslint-disable-next-line sonarjs/no-identical-functions
        it('no noInput', async () => {
          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noMatchHandler: {
              handle: sinon.stub().returns('else-id'),
            },
            noReplyHandler: {
              canHandle: sinon.stub().returns(false),
            },
          };

          const interactionHandler = InteractionGoogleHandler(utils as any);

          const block = {
            id: 'block-id',
            interactions: [
              { event: { intent: 'intent1', type: BaseRequest.RequestType.INTENT } },
              { event: { intent: 'intent2', type: BaseRequest.RequestType.INTENT } },
            ],
          };

          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: 'random-intent' } };
          const runtime = {
            trace: { addTrace: sinon.stub() },
            storage: { delete: sinon.stub() },
            getRequest: sinon.stub().returns(request),
            getAction: sinon.stub().returns(Action.REQUEST),
          };
          const variables = { foo: 'bar' };

          expect(interactionHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(
            'else-id'
          );
        });

        it('with noInput', async () => {
          const nextId = 'next-id';
          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noMatchHandler: {
              handle: sinon.stub().returns(false),
            },
            noReplyHandler: {
              canHandle: sinon.stub().returns(true),
              handle: sinon.stub().returns(nextId),
            },
            v: 'v2',
          };

          const interactionHandler = InteractionGoogleHandler(utils as any);

          const block = {
            id: 'block-id',
            elseId: 'else-id',
            interactions: [
              { event: { intent: 'intent1', type: BaseRequest.RequestType.INTENT } },
              { event: { intent: 'intent2', type: BaseRequest.RequestType.INTENT } },
            ],
          };
          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: 'random-intent' } };
          const runtime = {
            trace: { addTrace: sinon.stub() },
            storage: { delete: sinon.stub() },
            getRequest: sinon.stub().returns(request),
            getAction: sinon.stub().returns(Action.REQUEST),
          };
          const variables = { foo: 'bar' };

          expect(interactionHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(nextId);
        });
      });
    });
  });
});
