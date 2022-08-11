import { BaseNode } from '@voiceflow/base-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { CaptureV2Handler } from '@/lib/services/runtime/handlers/captureV2/captureV2';
import { Action, Store } from '@/runtime';
import DebugLogging from '@/runtime/lib/Runtime/DebugLogging';
import { getISO8601Timestamp } from '@/runtime/lib/Runtime/DebugLogging/utils';

describe('CaptureV2 handler', () => {
  describe('canHandle', () => {
    it('false', () => {
      expect(CaptureV2Handler(null as any).canHandle({} as any, null as any, null as any, null as any)).to.eql(false);
    });

    it('true', () => {
      expect(
        CaptureV2Handler(null as any).canHandle({ type: 'captureV2' } as any, null as any, null as any, null as any)
      ).to.eql(true);
    });
  });

  describe('handle', () => {
    it('action is running', () => {
      const utils = {
        addButtonsIfExists: sinon.stub(),
        addNoReplyTimeoutIfExists: sinon.stub(),
      };
      const handler = CaptureV2Handler(utils as any);

      const node = { id: 'node-id', intent: { name: 'intent-name' } };
      const runtime = {
        getAction: sinon.stub().returns(Action.RUNNING),
        getRequest: sinon.stub().returns({}),
        trace: { addTrace: sinon.stub() },
        storage: { delete: sinon.stub() },
      };
      const variables = { var1: 'val1' };
      expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.id);
      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: 'goto',
            payload: {
              request: {
                requiredEntities: undefined,
                type: 'intent',
                payload: { intent: { name: node.intent.name }, entities: [], query: '' },
                ELICIT: true,
              },
            },
          },
        ],
      ]);
    });

    describe('action is not response', () => {
      it('command can handle', () => {
        const output = 'next-id';
        const utils = {
          commandHandler: {
            canHandle: sinon.stub().returns(true),
            handle: sinon.stub().returns(output),
          },
          noReplyHandler: {
            canHandle: sinon.stub().returns(false),
          },
        };
        const handler = CaptureV2Handler(utils as any);

        const node = { id: 'node-id' };
        const runtime = {
          getAction: sinon.stub().returns(Action.REQUEST),
          setAction: sinon.stub(),
          getRequest: sinon.stub().returns({}),
          storage: { delete: sinon.stub() },
        };
        const variables = { var1: 'val1' };
        expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(output);

        expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
        expect(utils.commandHandler.handle.args).to.eql([[runtime, variables]]);
      });

      it('repeat can handle', () => {
        const output = 'next-id';
        const utils = {
          commandHandler: {
            canHandle: sinon.stub().returns(false),
          },
          repeatHandler: {
            canHandle: sinon.stub().returns(true),
            handle: sinon.stub().returns(output),
          },
          noReplyHandler: {
            canHandle: sinon.stub().returns(false),
          },
        };
        const handler = CaptureV2Handler(utils as any);

        const node = { id: 'node-id' };
        const runtime = {
          getAction: sinon.stub().returns(Action.REQUEST),
          setAction: sinon.stub(),
          getRequest: sinon.stub().returns({}),
          storage: { delete: sinon.stub() },
        };
        const variables = { var1: 'val1' };
        expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(output);

        expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
        expect(utils.repeatHandler.canHandle.args).to.eql([[runtime]]);
        expect(utils.repeatHandler.handle.args).to.eql([[runtime]]);
      });

      it('noReply can handle', () => {
        const output = 'next-id';
        const utils = {
          noReplyHandler: {
            canHandle: sinon.stub().returns(true),
            handle: sinon.stub().returns(output),
          },
        };
        const handler = CaptureV2Handler(utils as any);

        const node = { id: 'node-id' };
        const runtime = {
          getAction: sinon.stub().returns(Action.REQUEST),
          setAction: sinon.stub(),
          getRequest: sinon.stub().returns({}),
          storage: { delete: sinon.stub() },
        };
        const variables = { var1: 'val1' };
        expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(output);

        expect(utils.noReplyHandler.handle.args).to.eql([[node, runtime, variables]]);
      });
    });

    describe('command and repeat can not handle', () => {
      describe('intent request', () => {
        it('match intent', () => {
          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            repeatHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noReplyHandler: {
              canHandle: sinon.stub().returns(false),
            },
          };
          const handler = CaptureV2Handler(utils as any);

          const node = {
            id: 'node-id',
            intent: { name: 'intent1', entities: ['entity1', 'entity2'] },
            nextId: 'next-id',
            type: BaseNode.NodeType.CAPTURE_V2,
          };
          const request = {
            type: 'intent',
            payload: {
              intent: {
                name: 'intent1',
              },
              entities: [
                { name: 'entity1', value: 'value1' },
                { name: 'entity3', value: 'value3' },
              ],
            },
          };
          const runtime = {
            getAction: sinon.stub().returns(Action.REQUEST),
            getRequest: sinon.stub().returns(request),
            trace: { addTrace: sinon.stub() },
            storage: { delete: sinon.stub() },
            debugLogging: null as unknown as DebugLogging,
          };
          runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
          const variables = new Store();
          expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.nextId);

          expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
          expect(utils.repeatHandler.canHandle.args).to.eql([[runtime]]);
          expect(runtime.getRequest.callCount).to.eql(1);
          expect(runtime.trace.addTrace.args).to.eql([
            [
              {
                type: 'log',
                payload: {
                  kind: 'step.capture',
                  level: 'info',
                  message: {
                    changedVariables: {
                      entity1: {
                        after: 'value1',
                        before: null,
                      },
                      entity2: {
                        after: null,
                        before: null,
                      },
                    },
                    componentName: 'capture',
                    stepID: 'node-id',
                  },
                  timestamp: getISO8601Timestamp(),
                },
              },
            ],
            [{ type: 'path', payload: { path: 'capture' } }],
          ]);
          expect(variables).to.eql(new Store({ entity1: 'value1' }));
        });

        it('local scope', () => {
          const utils = {
            commandHandler: {
              canHandle: sinon.stub(),
            },
            repeatHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noReplyHandler: {
              canHandle: sinon.stub().returns(false),
            },
          };
          const handler = CaptureV2Handler(utils as any);

          const node = {
            id: 'node-id',
            intent: { name: 'intent1', entities: ['entity1', 'entity2'] },
            intentScope: BaseNode.Utils.IntentScope.NODE,
            nextId: 'next-id',
            type: BaseNode.NodeType.CAPTURE_V2,
          };
          const request = {
            type: 'intent',
            payload: {
              intent: {
                name: 'intent1',
              },
              entities: [],
            },
          };
          const runtime = {
            getAction: sinon.stub().returns(Action.REQUEST),
            getRequest: sinon.stub().returns(request),
            trace: { addTrace: sinon.stub() },
            storage: { delete: sinon.stub() },
            debugLogging: null as unknown as DebugLogging,
          };
          runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
          const variables = new Store();
          expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.nextId);

          expect(utils.commandHandler.canHandle.callCount).to.eql(0);
          expect(utils.repeatHandler.canHandle.args).to.eql([[runtime]]);
          expect(runtime.getRequest.callCount).to.eql(1);
          expect(runtime.trace.addTrace.args).to.eql([
            [
              {
                type: 'log',
                payload: {
                  kind: 'step.capture',
                  level: 'info',
                  message: {
                    changedVariables: {
                      entity1: {
                        after: null,
                        before: null,
                      },
                      entity2: {
                        after: null,
                        before: null,
                      },
                    },
                    componentName: 'capture',
                    stepID: 'node-id',
                  },
                  timestamp: getISO8601Timestamp(),
                },
              },
            ],
            [{ type: 'path', payload: { path: 'capture' } }],
          ]);
        });

        it('capture entire reply', () => {
          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            repeatHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noReplyHandler: {
              canHandle: sinon.stub().returns(false),
            },
          };
          const handler = CaptureV2Handler(utils as any);

          const node = { id: 'node-id', variable: 'variable1', nextId: 'next-id', type: BaseNode.NodeType.CAPTURE_V2 };
          const request = {
            type: 'intent',
            payload: {
              intent: {
                name: 'intent1',
              },
              entities: [],
              query: 'capture this',
              confidence: 0.9,
            },
          };
          const runtime = {
            getAction: sinon.stub().returns(Action.REQUEST),
            getRequest: sinon.stub().returns(request),
            trace: { addTrace: sinon.stub() },
            storage: { delete: sinon.stub() },
            debugLogging: null as unknown as DebugLogging,
          };
          runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
          const variables = new Store();
          expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.nextId);

          expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
          expect(utils.repeatHandler.canHandle.args).to.eql([[runtime]]);
          expect(runtime.getRequest.callCount).to.eql(1);
          expect(runtime.trace.addTrace.args).to.eql([
            [
              {
                type: 'log',
                payload: {
                  kind: 'step.capture',
                  level: 'info',
                  message: {
                    changedVariables: {
                      variable1: {
                        after: 'capture this',
                        before: null,
                      },
                    },
                    componentName: 'capture',
                    stepID: 'node-id',
                  },
                  timestamp: getISO8601Timestamp(),
                },
              },
            ],
            [{ type: 'path', payload: { path: 'capture' } }],
          ]);
          expect(variables).to.eql(new Store({ [node.variable]: request.payload.query }));
        });

        it('nomatch handler', () => {
          const noMatchHandler = sinon.stub().returns('no-match-path');
          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            repeatHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noReplyHandler: {
              canHandle: sinon.stub().returns(false),
            },
            entityFillingNoMatchHandler: {
              handle: sinon.stub().returns(noMatchHandler),
            },
          };
          const handler = CaptureV2Handler(utils as any);

          const node = { id: 'node-id', intent: { name: 'intent1' } };
          const request = { type: 'intent', payload: { intent: { name: 'intent2', entities: [] } } };
          const runtime = {
            getAction: sinon.stub().returns(Action.REQUEST),
            getRequest: sinon.stub().returns(request),
            trace: { addTrace: sinon.stub() },
            storage: { delete: sinon.stub() },
          };
          const variables = { var1: 'val1' };
          expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql('no-match-path');

          expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
          expect(utils.repeatHandler.canHandle.args).to.eql([[runtime]]);
          expect(runtime.getRequest.callCount).to.eql(1);
          expect(utils.entityFillingNoMatchHandler.handle.args).to.eql([[node, runtime, variables]]);
          expect(noMatchHandler.args).to.eql([
            [
              [node.intent.name],
              {
                requiredEntities: undefined,
                type: 'intent',
                payload: { intent: { name: node.intent.name }, entities: [], query: '' },
              },
            ],
          ]);
        });
      });
      describe('not intent request', () => {
        it('no node.intent nomatch handler', () => {
          const noMatchHandler = sinon.stub().returns('no-match-path');
          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            repeatHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noReplyHandler: {
              canHandle: sinon.stub().returns(false),
            },
            entityFillingNoMatchHandler: {
              handle: sinon.stub().returns(noMatchHandler),
            },
          };
          const handler = CaptureV2Handler(utils as any);

          const node = { id: 'node-id' };
          const request = { foo: 'bar' };
          const runtime = {
            getAction: sinon.stub().returns(Action.REQUEST),
            getRequest: sinon.stub().returns(request),
            storage: { delete: sinon.stub() },
          };
          const variables = { var1: 'val1' };
          expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql('no-match-path');

          expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
          expect(utils.repeatHandler.canHandle.args).to.eql([[runtime]]);
          expect(runtime.getRequest.callCount).to.eql(1);
          expect(utils.entityFillingNoMatchHandler.handle.args).to.eql([[node, runtime, variables]]);
          expect(noMatchHandler.args).to.eql([[]]);
        });

        it('node.intent nomatch handler', () => {
          const noMatchHandler = sinon.stub().returns('no-match-path');
          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            repeatHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noReplyHandler: {
              canHandle: sinon.stub().returns(false),
            },
            entityFillingNoMatchHandler: {
              handle: sinon.stub().returns(noMatchHandler),
            },
          };
          const handler = CaptureV2Handler(utils as any);

          const node = { id: 'node-id', intent: { name: 'intentName' } };
          const request = { foo: 'bar' };
          const runtime = {
            getAction: sinon.stub().returns(Action.REQUEST),
            getRequest: sinon.stub().returns(request),
            storage: { delete: sinon.stub() },
          };
          const variables = { var1: 'val1' };
          expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql('no-match-path');

          expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
          expect(utils.repeatHandler.canHandle.args).to.eql([[runtime]]);
          expect(runtime.getRequest.callCount).to.eql(1);
          expect(utils.entityFillingNoMatchHandler.handle.args).to.eql([[node, runtime, variables]]);
          expect(noMatchHandler.args).to.eql([
            [
              [node.intent.name],
              {
                requiredEntities: undefined,
                type: 'intent',
                payload: { intent: { name: node.intent.name }, entities: [], query: '' },
              },
            ],
          ]);
        });
      });
    });
  });
});
