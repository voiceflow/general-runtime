import { BaseRequest, BaseTrace } from '@voiceflow/base-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { CaptureAlexaHandler } from '@/lib/services/runtime/handlers/capture/capture.alexa';
import { Action } from '@/runtime';

describe('capture handler unit tests', async () => {
  afterEach(() => sinon.restore());

  describe('canHandle', () => {
    it('false', async () => {
      expect(CaptureAlexaHandler(null as any).canHandle({} as any, null as any, null as any, null as any)).to.eql(
        false
      );
    });

    it('true', async () => {
      expect(
        CaptureAlexaHandler(null as any).canHandle(
          { variable: 'var1', platform: VoiceflowConstants.PlatformType.ALEXA } as any,
          null as any,
          null as any,
          null as any
        )
      ).to.eql(true);
    });
  });

  describe('handle', () => {
    it('delegation', () => {
      const utils = {
        addRepromptIfExists: sinon.stub(),
      };

      const captureAlexaHandler = CaptureAlexaHandler(utils as any);

      const node = { id: 'node-id', intent: 'intent-name', slots: ['slot1'] };
      const runtime = {
        trace: { addTrace: sinon.stub() },
        turn: { get: sinon.stub().returns(null), set: sinon.stub() },
        getRequest: sinon.stub().returns({}),
        getAction: sinon.stub().returns(Action.RUNNING),
      };
      const variables = { foo: 'bar' };

      expect(captureAlexaHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.id);
      expect(utils.addRepromptIfExists.args).to.eql([[node, runtime, variables]]);
      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            payload: {
              request: {
                ELICIT: true,
                payload: {
                  entities: [],
                  intent: {
                    name: 'intent-name',
                  },
                  query: '',
                },
                requiredEntities: ['slot1'],
                type: BaseRequest.RequestType.INTENT,
              },
            },
            type: BaseTrace.TraceType.GOTO,
          },
        ],
      ]);
    });

    it('request type not intent', () => {
      const utils = {
        addRepromptIfExists: sinon.stub(),
      };

      const captureAlexaHandler = CaptureAlexaHandler(utils as any);

      const node = { id: 'node-id' };
      const runtime = {
        trace: { addTrace: sinon.stub() },
        turn: { get: sinon.stub().returns({ type: 'random' }) },
        getRequest: sinon.stub().returns({}),
        getAction: sinon.stub().returns(Action.RUNNING),
      };
      const variables = { foo: 'bar' };

      expect(captureAlexaHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.id);
      expect(utils.addRepromptIfExists.args).to.eql([[node, runtime, variables]]);
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

        const captureAlexaHandler = CaptureAlexaHandler(utils as any);

        const node = { id: 'node-id' };
        const runtime = {
          trace: { addTrace: sinon.stub() },
          turn: { get: sinon.stub().returns({ type: BaseRequest.RequestType.INTENT }) },
          getRequest: sinon.stub().returns({}),
          getAction: sinon.stub().returns(Action.REQUEST),
        };
        const variables = { foo: 'bar' };

        expect(captureAlexaHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(output);
        expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
        expect(utils.commandHandler.handle.args).to.eql([[runtime, variables]]);
      });

      describe('command cant handle', () => {
        it('no input', () => {
          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            repeatHandler: { canHandle: sinon.stub().returns(false) },
            getSlotValue: sinon.stub().returns(null),
            addRepromptIfExists: sinon.stub(),
          };

          const captureAlexaHandler = CaptureAlexaHandler(utils as any);

          const node = { nextId: 'next-id' };
          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: { slots: [] } } };
          const runtime = {
            trace: { addTrace: sinon.stub() },
            getRequest: sinon.stub().returns(request),
            getAction: sinon.stub().returns(Action.REQUEST),
          };
          const variables = { foo: 'bar' };

          expect(captureAlexaHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(
            node.nextId
          );
        });

        it('no slot', () => {
          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            repeatHandler: { canHandle: sinon.stub().returns(false) },
            getSlotValue: sinon.stub().returns(null),
          };

          const captureAlexaHandler = CaptureAlexaHandler(utils as any);

          const node = { nextId: 'next-id' };
          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: { slots: [null] } } };
          const runtime = {
            trace: { addTrace: sinon.stub() },
            getRequest: sinon.stub().returns(request),
            getAction: sinon.stub().returns(Action.REQUEST),
          };
          const variables = { foo: 'bar' };

          expect(captureAlexaHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(
            node.nextId
          );
        });

        it('input not number', () => {
          const word = 'not number';

          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            repeatHandler: { canHandle: sinon.stub().returns(false) },
            getSlotValue: sinon.stub().returns(word),
          };

          const captureAlexaHandler = CaptureAlexaHandler(utils as any);

          const node = { nextId: 'next-id', variable: 'var' };
          const input = 'input';
          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: { slots: [{ value: input }] } } };
          const runtime = {
            trace: { addTrace: sinon.stub() },
            getRequest: sinon.stub().returns(request),
            getAction: sinon.stub().returns(Action.REQUEST),
          };
          const variables = { set: sinon.stub() };

          expect(captureAlexaHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(
            node.nextId
          );
          expect(utils.getSlotValue.args).to.eql([[request.payload.intent]]);
          expect(variables.set.args).to.eql([[node.variable, word]]);
        });

        it('input is number', () => {
          const word = 1;

          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            repeatHandler: { canHandle: sinon.stub().returns(false) },
            getSlotValue: sinon.stub().returns(word),
          };

          const captureAlexaHandler = CaptureAlexaHandler(utils as any);

          const node = { variable: 'var' };
          const input = 'input';
          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: { slots: [{ value: input }] } } };
          const runtime = {
            trace: { addTrace: sinon.stub() },
            getRequest: sinon.stub().returns(request),
            getAction: sinon.stub().returns(Action.REQUEST),
          };
          const variables = { set: sinon.stub() };

          expect(captureAlexaHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
          expect(utils.getSlotValue.args).to.eql([[request.payload.intent]]);
          expect(variables.set.args).to.eql([[node.variable, word]]);
        });
      });
    });
  });
});
