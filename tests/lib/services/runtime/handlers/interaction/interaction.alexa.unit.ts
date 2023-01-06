import { BaseNode, BaseRequest } from '@voiceflow/base-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import { expect } from 'chai';
import _ from 'lodash';
import sinon from 'sinon';

import { InteractionAlexaHandler } from '@/lib/services/runtime/handlers/interaction/interaction.alexa';
import { StorageType } from '@/lib/services/runtime/types';
import { Action } from '@/runtime';

describe('interaction handler unit tests', async () => {
  afterEach(() => sinon.restore());

  describe('canHandle', () => {
    it('false', async () => {
      expect(InteractionAlexaHandler(null as any).canHandle({} as any, null as any, null as any, null as any)).to.eql(
        false
      );
    });

    it('true', async () => {
      expect(
        InteractionAlexaHandler(null as any).canHandle(
          { interactions: { foo: 'bar' }, platform: VoiceflowConstants.PlatformType.ALEXA } as any,
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
      };

      const captureHandler = InteractionAlexaHandler(utils as any);

      const node = { id: 'node-id', interactions: [] };
      const runtime = {
        trace: { addTrace: sinon.stub() },
        storage: { delete: sinon.stub() },
        getRequest: sinon.stub().returns({ type: 'random' }),
        getAction: sinon.stub().returns(Action.RUNNING),
      };
      const variables = { foo: 'bar' };

      expect(captureHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.id);
      expect(utils.addRepromptIfExists.args).to.eql([[node, runtime, variables]]);
      expect(runtime.trace.addTrace.args).to.eql([]);
      expect(runtime.storage.delete.args).to.eql([[StorageType.NO_MATCHES_COUNTER]]);
    });

    describe('request type is intent', () => {
      it('command handler can handle', () => {
        const output = 'bar';

        const utils = {
          commandHandler: {
            canHandle: sinon.stub().returns(true),
            handle: sinon.stub().returns(output),
          },
        };

        const interactionHandler = InteractionAlexaHandler(utils as any);

        const node = { id: 'node-id', interactions: [] };
        const runtime = {
          storage: { get: sinon.stub().returns(undefined), delete: sinon.stub() },
          getRequest: sinon.stub().returns({ type: BaseRequest.RequestType.INTENT, payload: {} }),
          getAction: sinon.stub().returns(Action.REQUEST),
        };
        const variables = { foo: 'bar' };

        expect(interactionHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(output);
        expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
        expect(utils.commandHandler.handle.args).to.eql([[runtime, variables]]);
      });

      describe('command cant handle', () => {
        it('no choice', () => {
          const utils = {
            formatIntentName: sinon.stub().returns(false),
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            repeatHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noMatchHandler: {
              handle: sinon.stub().returns(null),
            },
          };

          const interactionHandler = InteractionAlexaHandler(utils as any);

          const node = {
            id: 'node-id',
            interactions: [
              { event: { intent: 'intent1', type: BaseRequest.RequestType.INTENT } },
              { event: { intent: 'intent2', type: BaseRequest.RequestType.INTENT } },
            ],
          };
          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: { name: 'random-intent' } } };
          const runtime = {
            getRequest: sinon.stub().returns(request),
            storage: { delete: sinon.stub(), get: sinon.stub().returns(undefined) },
            getAction: sinon.stub().returns(Action.REQUEST),
          };
          const variables = { foo: 'bar' };

          expect(interactionHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
          expect(utils.formatIntentName.args).to.eql([
            [node.interactions[0].event.intent],
            [node.interactions[1].event.intent],
          ]);
        });

        it('no choice with elseId', () => {
          const node = {
            id: 'node-id',
            elseId: 'else-id',
            interactions: [
              { event: { intent: 'intent1', type: BaseRequest.RequestType.INTENT } },
              { event: { intent: 'intent2', type: BaseRequest.RequestType.INTENT } },
            ],
          };

          const utils = {
            formatIntentName: sinon.stub().returns(false),
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            repeatHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noMatchHandler: {
              handle: sinon.stub().returns(node.elseId),
            },
          };

          const interactionHandler = InteractionAlexaHandler(utils as any);

          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: { name: 'random-intent' } } };
          const runtime = {
            getRequest: sinon.stub().returns(request),
            storage: { delete: sinon.stub(), get: sinon.stub().returns(undefined) },
            getAction: sinon.stub().returns(Action.REQUEST),
          };
          const variables = { foo: 'bar' };

          expect(interactionHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(
            node.elseId
          );
        });

        it('local scope', () => {
          const node = {
            id: 'node-id',
            elseId: 'else-id',
            interactions: [
              { event: { intent: 'intent1', type: BaseRequest.RequestType.INTENT } },
              { event: { intent: 'intent2', type: BaseRequest.RequestType.INTENT } },
            ],
            intentScope: BaseNode.Utils.IntentScope.NODE,
          };

          const utils = {
            formatIntentName: sinon.stub().returns(false),
            commandHandler: {
              canHandle: sinon.stub(),
            },
            repeatHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noMatchHandler: {
              handle: sinon.stub().returns(node.elseId),
            },
          };

          const interactionHandler = InteractionAlexaHandler(utils as any);

          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: { name: 'random-intent' } } };
          const runtime = {
            getRequest: sinon.stub().returns(request),
            storage: { delete: sinon.stub(), get: sinon.stub().returns(undefined) },
            getAction: sinon.stub().returns(Action.REQUEST),
          };

          expect(interactionHandler.handle(node as any, runtime as any, {} as any, null as any)).to.eql(node.elseId);
          expect(utils.commandHandler.canHandle.callCount).to.eql(0);
        });

        it('no choice with noMatches', () => {
          const nextId = 'next-id';
          const noMatches = ['speak1', 'speak2', 'speak3'];

          const utils = {
            formatIntentName: sinon.stub().returns(false),
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            repeatHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noMatchHandler: {
              handle: sinon.stub().returns(nextId),
            },
          };

          const interactionHandler = InteractionAlexaHandler(utils as any);

          const node = {
            id: 'node-id',
            interactions: [
              { event: { intent: 'intent1', type: BaseRequest.RequestType.INTENT } },
              { event: { intent: 'intent2', type: BaseRequest.RequestType.INTENT } },
            ],
            noMatches,
          };
          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: { name: 'random-intent' } } };
          const runtime = {
            getRequest: sinon.stub().returns(request),
            storage: { get: sinon.stub().returns(undefined), delete: sinon.stub() },
            getAction: sinon.stub().returns(Action.REQUEST),
          };
          const variables = { foo: 'bar' };

          expect(interactionHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(nextId);
          expect(utils.formatIntentName.args).to.eql([
            [node.interactions[0].event.intent],
            [node.interactions[1].event.intent],
          ]);
          expect(utils.noMatchHandler.handle.args).to.eql([[node, runtime, variables]]);
        });

        it('choice without mappings', () => {
          const intentName = 'random-intent';

          const utils = {
            formatIntentName: sinon.stub().returns(intentName),
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            repeatHandler: {
              canHandle: sinon.stub().returns(false),
            },
          };

          const interactionHandler = InteractionAlexaHandler(utils as any);

          const node = {
            id: 'node-id',
            elseId: 'else-id',
            interactions: [
              { event: { intent: 'random-intent  ', type: BaseRequest.RequestType.INTENT }, nextId: 'id-one' },
            ],
          };
          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: { name: intentName } } };
          const runtime = {
            trace: { debug: sinon.stub() },
            getRequest: sinon.stub().returns(request),
            storage: { delete: sinon.stub(), get: sinon.stub().returns(undefined) },
            getAction: sinon.stub().returns(Action.REQUEST),
          };
          const variables = { foo: 'bar' };

          expect(interactionHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(
            node.interactions[0].nextId
          );
          expect(runtime.trace.debug.args).to.eql([]);
        });

        it('choice without mappings but nextIdIndex', () => {
          const intentName = 'random-intent';

          const utils = {
            formatIntentName: sinon.stub().returns(intentName),
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            repeatHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noMatchHandler: {
              canHandle: sinon.stub().returns(false),
            },
          };

          const interactionHandler = InteractionAlexaHandler(utils as any);

          const node = {
            id: 'node-id',
            elseId: 'else-id',
            interactions: [
              { event: { intent: 'random-intent  ', type: BaseRequest.RequestType.INTENT }, nextId: 'id-two' },
            ],
          };
          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: { name: intentName } } };
          const runtime = {
            trace: { debug: sinon.stub() },
            getRequest: sinon.stub().returns(request),
            storage: { delete: sinon.stub(), get: sinon.stub().returns(undefined) },
            getAction: sinon.stub().returns(Action.REQUEST),
          };
          const variables = { foo: 'bar' };

          expect(interactionHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(
            node.interactions[0].nextId
          );
          expect(runtime.trace.debug.args).to.eql([]);
        });

        it('goto choice', () => {
          const intentName = 'random-intent';
          const goToIntentName = 'go-to-intent';

          const utils = {
            formatIntentName: sinon.stub().returns(intentName),
          };

          const interactionHandler = InteractionAlexaHandler(utils as any);

          const block = {
            id: 'block-id',
            elseId: 'else-id',
            interactions: [
              {
                event: { intent: 'random-intent', type: BaseRequest.RequestType.INTENT },
                goTo: { intentName: goToIntentName },
              },
            ],
          };
          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: { name: intentName } } };
          const runtime = {
            getRequest: sinon.stub().returns(request),
            storage: { delete: sinon.stub(), get: sinon.stub().returns(undefined), set: sinon.stub() },
            trace: { addTrace: sinon.stub() },
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
                      intent: { name: goToIntentName },
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
          expect(runtime.storage.set.callCount).to.eql(0);
        });

        it('skip interactions', () => {
          const intentName = 'other-intent';
          const block = {
            id: 'block-id',
            elseId: 'else-id',
            interactions: [
              { event: { intent: 'random-intent', type: BaseRequest.RequestType.INTENT }, nextId: 'id-one' },
            ],
          };
          const utils = {
            formatIntentName: sinon.stub().callsFake(_.identity),
            noMatchHandler: { handle: sinon.stub().returns(block.elseId) },
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            repeatHandler: {
              canHandle: sinon.stub().returns(false),
            },
          };

          const interactionHandler = InteractionAlexaHandler(utils as any);

          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: { name: intentName } } };
          const runtime = {
            getRequest: sinon.stub().returns(request),
            getAction: sinon.stub().returns(Action.REQUEST),
          };
          const variables = { foo: 'bar' };

          expect(interactionHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(
            block.elseId
          );
        });

        it('choice with mappings', () => {
          const intentName = 'random-intent';
          const mappedSlots = { slot1: 'slot-1' };

          const utils = {
            formatIntentName: sinon.stub().returns(intentName),
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            repeatHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noMatchHandler: {
              canHandle: sinon.stub().returns(false),
            },
            mapSlots: sinon.stub().returns(mappedSlots),
          };

          const interactionHandler = InteractionAlexaHandler(utils as any);

          const node = {
            id: 'node-id',
            elseId: 'else-id',
            interactions: [
              {
                event: {
                  intent: 'random-intent  ',
                  type: BaseRequest.RequestType.INTENT,
                  mappings: { foo: 'bar' },
                },
                nextId: 'id-one',
              },
            ],
          };
          const request = {
            type: BaseRequest.RequestType.INTENT,
            payload: { intent: { name: intentName, slots: { foo2: 'bar2' } } },
          };
          const runtime = {
            trace: { debug: sinon.stub() },
            getRequest: sinon.stub().returns(request),
            storage: { delete: sinon.stub(), get: sinon.stub().returns(undefined) },
            getAction: sinon.stub().returns(Action.REQUEST),
          };
          const variables = { merge: sinon.stub() };

          expect(interactionHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(
            node.interactions[0].nextId
          );
          expect(utils.mapSlots.args).to.eql([
            [{ mappings: node.interactions[0].event.mappings, slots: request.payload.intent.slots }],
          ]);
          expect(variables.merge.args).to.eql([[mappedSlots]]);
          expect(runtime.trace.debug.args).to.eql([]);
        });
      });
    });
  });
});
