/* eslint-disable max-nested-callbacks */
import { RequestType } from '@voiceflow/general-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { CaptureHandler } from '@/lib/services/runtime/handlers/capture';
import { Action } from '@/runtime';

const CapturePathTrace = { type: 'path', payload: { path: 'capture' } };

describe('Capture handler', () => {
  describe('canHandle', () => {
    it('false', () => {
      expect(CaptureHandler(null as any).canHandle({} as any, null as any, null as any, null as any)).to.eql(false);
    });

    it('true', () => {
      expect(CaptureHandler(null as any).canHandle({ variables: {} } as any, null as any, null as any, null as any)).to.eql(false);
    });
  });

  describe('handle', () => {
    it('action is response', () => {
      const utils = {
        addRepromptIfExists: sinon.stub(),
        addChipsIfExists: sinon.stub(),
      };
      const handler = CaptureHandler(utils as any);

      const node = { id: 'node-id' };
      const runtime = { getAction: sinon.stub().returns(Action.RESPONSE) };
      const variables = { var1: 'val1' };
      expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.id);
    });

    describe('action is not response', () => {
      it('command can handle', () => {
        const output = 'next-id';
        const utils = {
          commandHandler: {
            canHandle: sinon.stub().returns(true),
            handle: sinon.stub().returns(output),
          },
        };
        const handler = CaptureHandler(utils as any);

        const node = { id: 'node-id' };
        const runtime = { getAction: sinon.stub().returns(Action.REQUEST), setAction: sinon.stub() };
        const variables = { var1: 'val1' };
        expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(output);

        expect(runtime.setAction.args).to.eql([[Action.RESPONSE]]);
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
        };
        const handler = CaptureHandler(utils as any);

        const node = { id: 'node-id' };
        const runtime = { getAction: sinon.stub().returns(Action.REQUEST), setAction: sinon.stub() };
        const variables = { var1: 'val1' };
        expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(output);

        expect(runtime.setAction.args).to.eql([[Action.RESPONSE]]);
        expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
        expect(utils.repeatHandler.canHandle.args).to.eql([[runtime]]);
        expect(utils.repeatHandler.handle.args).to.eql([[runtime]]);
      });

      describe('command and repeat can not handle', () => {
        describe('not intent request', () => {
          it('with nextID', () => {
            const utils = {
              commandHandler: {
                canHandle: sinon.stub().returns(false),
              },
              repeatHandler: {
                canHandle: sinon.stub().returns(false),
              },
            };
            const handler = CaptureHandler(utils as any);

            const node = { id: 'node-id', nextId: 'next-id' };
            const request = { foo: 'bar' };
            const runtime = {
              getAction: sinon.stub().returns(Action.REQUEST),
              setAction: sinon.stub(),
              getRequest: sinon.stub().returns(request),
              trace: { addTrace: sinon.stub() },
            };
            const variables = { var1: 'val1' };
            expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.nextId);

            expect(runtime.setAction.args).to.eql([[Action.RESPONSE]]);
            expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
            expect(utils.repeatHandler.canHandle.args).to.eql([[runtime]]);
            expect(runtime.getRequest.callCount).to.eql(1);
            expect(runtime.trace.addTrace.args).to.eql([[CapturePathTrace]]);
          });

          it('without nextID', () => {
            const utils = {
              commandHandler: {
                canHandle: sinon.stub().returns(false),
              },
              repeatHandler: {
                canHandle: sinon.stub().returns(false),
              },
            };
            const handler = CaptureHandler(utils as any);

            const node = { id: 'node-id' };
            const request = { foo: 'bar' };
            const runtime = {
              getAction: sinon.stub().returns(Action.REQUEST),
              setAction: sinon.stub(),
              getRequest: sinon.stub().returns(request),
              trace: { addTrace: sinon.stub() },
            };
            const variables = { var1: 'val1' };
            expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);

            expect(runtime.setAction.args).to.eql([[Action.RESPONSE]]);
            expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
            expect(utils.repeatHandler.canHandle.args).to.eql([[runtime]]);
            expect(runtime.getRequest.callCount).to.eql(1);
            expect(runtime.trace.addTrace.args).to.eql([[CapturePathTrace]]);
          });
        });

        describe('intent request', () => {
          it('no query', () => {
            const utils = {
              commandHandler: {
                canHandle: sinon.stub().returns(false),
              },
              repeatHandler: {
                canHandle: sinon.stub().returns(false),
              },
            };
            const handler = CaptureHandler(utils as any);

            const node = { id: 'node-id' };
            const request = { type: RequestType.INTENT, payload: { intent: { name: 'intent_name' }, entities: [] } };
            const runtime = {
              getAction: sinon.stub().returns(Action.REQUEST),
              setAction: sinon.stub(),
              getRequest: sinon.stub().returns(request),
              trace: { addTrace: sinon.stub() },
            };
            const variables = { var1: 'val1' };
            expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);

            expect(runtime.setAction.args).to.eql([[Action.RESPONSE]]);
            expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
            expect(utils.repeatHandler.canHandle.args).to.eql([[runtime]]);
            expect(runtime.getRequest.callCount).to.eql(1);
            expect(runtime.trace.addTrace.args).to.eql([[CapturePathTrace]]);
          });

          describe('query not number', () => {
            it('string', () => {
              const utils = {
                wordsToNumbers: sinon.stub().returns('str'),
                commandHandler: {
                  canHandle: sinon.stub().returns(false),
                },
                repeatHandler: {
                  canHandle: sinon.stub().returns(false),
                },
              };
              const handler = CaptureHandler(utils as any);

              const node = { id: 'node-id', variable: 'var' };
              const request = { type: RequestType.INTENT, payload: { intent: { name: 'intent_name' }, entities: [], query: 'q' } };
              const runtime = {
                getAction: sinon.stub().returns(Action.REQUEST),
                setAction: sinon.stub(),
                getRequest: sinon.stub().returns(request),
                trace: { addTrace: sinon.stub() },
              };
              const variables = { var1: 'val1', set: sinon.stub() };
              expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);

              expect(runtime.setAction.args).to.eql([[Action.RESPONSE]]);
              expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
              expect(utils.repeatHandler.canHandle.args).to.eql([[runtime]]);
              expect(runtime.getRequest.callCount).to.eql(1);
              expect(utils.wordsToNumbers.args).to.eql([[request.payload.query]]);
              expect(variables.set.args).to.eql([[node.variable, request.payload.query]]);
              expect(runtime.trace.addTrace.args).to.eql([[CapturePathTrace]]);
            });

            it('NaN', () => {
              const utils = {
                wordsToNumbers: sinon.stub().returns(NaN),
                commandHandler: {
                  canHandle: sinon.stub().returns(false),
                },
                repeatHandler: {
                  canHandle: sinon.stub().returns(false),
                },
              };
              const handler = CaptureHandler(utils as any);

              const node = { id: 'node-id', variable: 'var' };
              const request = { type: RequestType.INTENT, payload: { intent: { name: 'intent_name' }, entities: [], query: 'q' } };
              const runtime = {
                getAction: sinon.stub().returns(Action.REQUEST),
                setAction: sinon.stub(),
                getRequest: sinon.stub().returns(request),
                trace: { addTrace: sinon.stub() },
              };
              const variables = { var1: 'val1', set: sinon.stub() };
              expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);

              expect(runtime.setAction.args).to.eql([[Action.RESPONSE]]);
              expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
              expect(utils.repeatHandler.canHandle.args).to.eql([[runtime]]);
              expect(runtime.getRequest.callCount).to.eql(1);
              expect(utils.wordsToNumbers.args).to.eql([[request.payload.query]]);
              expect(variables.set.args).to.eql([[node.variable, request.payload.query]]);
              expect(runtime.trace.addTrace.args).to.eql([[CapturePathTrace]]);
            });
          });

          describe('query is number', () => {
            it('works', () => {
              const num = 5;
              const utils = {
                wordsToNumbers: sinon.stub().returns(num),
                commandHandler: {
                  canHandle: sinon.stub().returns(false),
                },
                repeatHandler: {
                  canHandle: sinon.stub().returns(false),
                },
              };
              const handler = CaptureHandler(utils as any);

              const node = { id: 'node-id', variable: 'var' };
              const request = { type: RequestType.INTENT, payload: { intent: { name: 'intent_name' }, entities: [], query: 'q' } };
              const runtime = {
                getAction: sinon.stub().returns(Action.REQUEST),
                setAction: sinon.stub(),
                getRequest: sinon.stub().returns(request),
                trace: { addTrace: sinon.stub() },
              };
              const variables = { var1: 'val1', set: sinon.stub() };
              expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);

              expect(runtime.setAction.args).to.eql([[Action.RESPONSE]]);
              expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
              expect(utils.repeatHandler.canHandle.args).to.eql([[runtime]]);
              expect(runtime.getRequest.callCount).to.eql(1);
              expect(utils.wordsToNumbers.args).to.eql([[request.payload.query]]);
              expect(variables.set.args).to.eql([[node.variable, num]]);
              expect(runtime.trace.addTrace.args).to.eql([[CapturePathTrace]]);
            });
          });
        });
      });
    });
  });
});
