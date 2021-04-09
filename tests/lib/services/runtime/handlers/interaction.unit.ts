/* eslint-disable max-nested-callbacks */
import { EventType, IntentRequest, NodeType, Request, RequestType, TraceType } from '@voiceflow/general-types';
import { Action } from '@voiceflow/runtime';
import { expect } from 'chai';
import sinon from 'sinon';

import { InteractionHandler } from '@/lib/services/runtime/handlers/interaction';
import { StorageType } from '@/lib/services/runtime/types';

describe('Interaction handler', () => {
  describe('canHandle', () => {
    it('false', () => {
      expect(InteractionHandler(null as any).canHandle({} as any, null as any, null as any, null as any)).to.eql(false);
    });

    it('true', () => {
      expect(InteractionHandler(null as any).canHandle({ interactions: [] } as any, null as any, null as any, null as any)).to.eql(true);
    });
  });

  describe('handle', () => {
    describe('action is response', () => {
      it('chips exist', () => {
        const utils = {
          addRepromptIfExists: sinon.stub(),
          addChipsIfExists: sinon.stub().returns(true),
        };

        const node = { id: 'node-id' };
        const runtime = { getAction: sinon.stub().returns(Action.RESPONSE), storage: { delete: sinon.stub() } };
        const variables = { var1: 'val1' };
        const handler = InteractionHandler(utils as any);

        expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.id);
        expect(runtime.getAction.callCount).to.eql(1);
        expect(utils.addRepromptIfExists.args).to.eql([[node, runtime, variables]]);
        expect(utils.addChipsIfExists.args).to.eql([[node, runtime, variables]]);
        expect(runtime.storage.delete.args).to.eql([[StorageType.NO_MATCHES_COUNTER]]);
      });

      it('no chips', () => {
        const utils = {
          addRepromptIfExists: sinon.stub(),
          addChipsIfExists: sinon.stub().returns(false),
        };

        const node = {
          id: 'node-id',
          interactions: [{}, { event: { type: 'random' } }, { event: { type: EventType.INTENT, intent: 'intent-name' } }],
        };
        const runtime = { getAction: sinon.stub().returns(Action.RESPONSE), storage: { delete: sinon.stub() }, trace: { addTrace: sinon.stub() } };
        const variables = { var1: 'val1' };
        const handler = InteractionHandler(utils as any);

        expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.id);
        expect(runtime.getAction.callCount).to.eql(1);
        expect(utils.addRepromptIfExists.args).to.eql([[node, runtime, variables]]);
        expect(utils.addChipsIfExists.args).to.eql([[node, runtime, variables]]);
        expect(runtime.trace.addTrace.args).to.eql([
          [{ type: TraceType.CHOICE, payload: { choices: [{ intent: 'intent-name', name: 'intent-name' }] } }],
        ]);
        expect(runtime.storage.delete.args).to.eql([[StorageType.NO_MATCHES_COUNTER]]);
      });
    });

    describe('action is not response', () => {
      describe('no handler found', () => {
        it('with elseId', () => {
          const utils = {
            commandHandler: { canHandle: sinon.stub().returns(false) },
            repeatHandler: { canHandle: sinon.stub().returns(false) },
            noMatchHandler: { canHandle: sinon.stub().returns(false) },
          };

          const node = { id: 'node-id', elseId: 'else-id', interactions: [] };
          const runtime = { getAction: sinon.stub().returns(Action.REQUEST), setAction: sinon.stub() };
          const variables = { var1: 'val1' };
          const handler = InteractionHandler(utils as any);

          expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.elseId);
          expect(runtime.getAction.callCount).to.eql(1);
          expect(runtime.setAction.args).to.eql([[Action.RESPONSE]]);
          expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
          expect(utils.repeatHandler.canHandle.args).to.eql([[runtime]]);
          expect(utils.noMatchHandler.canHandle.args).to.eql([[node, runtime]]);
        });

        describe('without elseId', () => {
          it('no interactions', () => {
            const utils = {
              commandHandler: { canHandle: sinon.stub().returns(false) },
              repeatHandler: { canHandle: sinon.stub().returns(false) },
              noMatchHandler: { canHandle: sinon.stub().returns(false) },
            };

            const node = { id: 'node-id', interactions: [] };
            const runtime = { getAction: sinon.stub().returns(Action.REQUEST), setAction: sinon.stub() };
            const variables = { var1: 'val1' };
            const handler = InteractionHandler(utils as any);

            expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
            expect(runtime.getAction.callCount).to.eql(1);
            expect(runtime.setAction.args).to.eql([[Action.RESPONSE]]);
            expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
            expect(utils.repeatHandler.canHandle.args).to.eql([[runtime]]);
            expect(utils.noMatchHandler.canHandle.args).to.eql([[node, runtime]]);
          });

          it('no matcher', () => {
            const utils = {
              commandHandler: { canHandle: sinon.stub().returns(false) },
              repeatHandler: { canHandle: sinon.stub().returns(false) },
              noMatchHandler: { canHandle: sinon.stub().returns(false) },
              findEventMatcher: sinon.stub().returns(null),
            };

            const node = { id: 'node-id', interactions: [{ event: { foo: 'bar' } }] };
            const runtime = { getAction: sinon.stub().returns(Action.REQUEST), setAction: sinon.stub() };
            const variables = { var1: 'val1' };
            const handler = InteractionHandler(utils as any);

            expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
            expect(runtime.getAction.callCount).to.eql(1);
            expect(runtime.setAction.args).to.eql([[Action.RESPONSE]]);
            expect(utils.findEventMatcher.args).to.eql([[{ event: node.interactions[0].event, runtime, variables }]]);
            expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
            expect(utils.repeatHandler.canHandle.args).to.eql([[runtime]]);
            expect(utils.noMatchHandler.canHandle.args).to.eql([[node, runtime]]);
          });
        });
      });

      describe('handler found', () => {
        it('command can handle', () => {
          const output = 'next-id';
          const utils = {
            commandHandler: { canHandle: sinon.stub().returns(true), handle: sinon.stub().returns(output) },
          };

          const node = { id: 'node-id', interactions: [] };
          const runtime = { getAction: sinon.stub().returns(Action.REQUEST), setAction: sinon.stub() };
          const variables = { var1: 'val1' };
          const handler = InteractionHandler(utils as any);

          expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(output);
          expect(runtime.getAction.callCount).to.eql(1);
          expect(runtime.setAction.args).to.eql([[Action.RESPONSE]]);
          expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
          expect(utils.commandHandler.handle.args).to.eql([[runtime, variables]]);
        });

        it('repeat can handle', () => {
          const output = 'next-id';
          const utils = {
            commandHandler: { canHandle: sinon.stub().returns(false) },
            repeatHandler: { canHandle: sinon.stub().returns(true), handle: sinon.stub().returns(output) },
          };

          const node = { id: 'node-id', interactions: [] };
          const runtime = { getAction: sinon.stub().returns(Action.REQUEST), setAction: sinon.stub() };
          const variables = { var1: 'val1' };
          const handler = InteractionHandler(utils as any);

          expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(output);
          expect(runtime.getAction.callCount).to.eql(1);
          expect(runtime.setAction.args).to.eql([[Action.RESPONSE]]);
          expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
          expect(utils.repeatHandler.canHandle.args).to.eql([[runtime]]);
          expect(utils.repeatHandler.handle.args).to.eql([[runtime]]);
        });

        it('noMatch can handle', () => {
          const output = 'next-id';
          const utils = {
            commandHandler: { canHandle: sinon.stub().returns(false) },
            repeatHandler: { canHandle: sinon.stub().returns(false) },
            noMatchHandler: { canHandle: sinon.stub().returns(true), handle: sinon.stub().returns(output) },
          };

          const node = { id: 'node-id', interactions: [] };
          const runtime = { getAction: sinon.stub().returns(Action.REQUEST), setAction: sinon.stub() };
          const variables = { var1: 'val1' };
          const handler = InteractionHandler(utils as any);

          expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(output);
          expect(runtime.getAction.callCount).to.eql(1);
          expect(runtime.setAction.args).to.eql([[Action.RESPONSE]]);
          expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
          expect(utils.repeatHandler.canHandle.args).to.eql([[runtime]]);
          expect(utils.noMatchHandler.canHandle.args).to.eql([[node, runtime]]);
          expect(utils.noMatchHandler.handle.args).to.eql([[node, runtime, variables]]);
        });

        describe('eventMatcher can handle', () => {
          it('with nextId', () => {
            const sideEffect = sinon.stub();
            const utils = {
              findEventMatcher: sinon.stub().returns({ sideEffect }),
            };

            const node = { id: 'node-id', interactions: [{ event: { foo: 'bar' }, nextId: 'next-id' }] };
            const runtime = { getAction: sinon.stub().returns(Action.REQUEST), setAction: sinon.stub() };
            const variables = { var1: 'val1' };
            const handler = InteractionHandler(utils as any);

            expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.interactions[0].nextId);
            expect(runtime.getAction.callCount).to.eql(1);
            expect(runtime.setAction.args).to.eql([[Action.RESPONSE]]);
            expect(utils.findEventMatcher.args).to.eql([[{ event: node.interactions[0].event, runtime, variables }]]);
            expect(sideEffect.callCount).to.eql(1);
          });

          it('without nextId', () => {
            const sideEffect = sinon.stub();
            const utils = {
              findEventMatcher: sinon.stub().returns({ sideEffect }),
            };

            const node = { id: 'node-id', interactions: [{ event: { foo: 'bar' } }] };
            const runtime = { getAction: sinon.stub().returns(Action.REQUEST), setAction: sinon.stub() };
            const variables = { var1: 'val1' };
            const handler = InteractionHandler(utils as any);

            expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
            expect(runtime.getAction.callCount).to.eql(1);
            expect(runtime.setAction.args).to.eql([[Action.RESPONSE]]);
            expect(utils.findEventMatcher.args).to.eql([[{ event: node.interactions[0].event, runtime, variables }]]);
            expect(sideEffect.callCount).to.eql(1);
          });
        });
      });
    });
  });
});
