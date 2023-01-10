import { BaseRequest } from '@voiceflow/base-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { CaptureGoogleHandler } from '@/lib/services/runtime/handlers/capture/capture.google';
import { Action } from '@/runtime';

describe('capture handler unit tests', async () => {
  afterEach(() => sinon.restore());

  describe('canHandle', () => {
    it('false', async () => {
      expect(CaptureGoogleHandler(null as any).canHandle({} as any, null as any, null as any, null as any)).to.eql(
        false
      );
    });

    it('true', async () => {
      expect(
        CaptureGoogleHandler(null as any).canHandle(
          { variable: 'var1', platform: VoiceflowConstants.PlatformType.GOOGLE } as any,
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

      const captureHandler = CaptureGoogleHandler(utils as any);

      const block = { id: 'block-id' };
      const runtime = {
        getRequest: sinon.stub().returns({ type: 'random' }),
        getAction: sinon.stub().returns(Action.RUNNING),
      };
      const variables = { foo: 'bar' };

      expect(captureHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(block.id);
      expect(utils.addRepromptIfExists.args).to.eql([[block, runtime, variables]]);
      expect(utils.addButtonsIfExists.args).to.eql([[block, runtime, variables]]);
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

        const captureHandler = CaptureGoogleHandler(utils as any);

        const block = { id: 'block-id' };
        const runtime = {
          getRequest: sinon.stub().returns({ type: BaseRequest.RequestType.INTENT }),
          getAction: sinon.stub().returns(Action.REQUEST),
        };
        const variables = { foo: 'bar' };

        expect(captureHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(output);
        expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
        expect(utils.commandHandler.handle.args).to.eql([[runtime, variables]]);
      });

      describe('command cant handle', () => {
        it('no input', () => {
          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noReplyHandler: { canHandle: sinon.stub().returns(false) },
          };

          const captureHandler = CaptureGoogleHandler(utils as any);

          const block = { nextId: 'next-id' };
          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: null } };
          const runtime = {
            getRequest: sinon.stub().returns(request),
            getAction: sinon.stub().returns(Action.REQUEST),
          };
          const variables = { foo: 'bar' };

          expect(captureHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(
            block.nextId
          );
        });

        it('input not number', () => {
          const word = 'not number';

          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noReplyHandler: { canHandle: sinon.stub().returns(false) },
            wordsToNumbers: sinon.stub().returns(word),
          };

          const captureHandler = CaptureGoogleHandler(utils as any);

          const block = { nextId: 'next-id', variable: 'var' };
          const request = { type: BaseRequest.RequestType.INTENT, payload: { input: 'input' } };
          const runtime = {
            getRequest: sinon.stub().returns(request),
            getAction: sinon.stub().returns(Action.REQUEST),
          };
          const variables = { set: sinon.stub() };

          expect(captureHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(
            block.nextId
          );
          expect(utils.wordsToNumbers.args).to.eql([[request.payload.input]]);
          expect(variables.set.args).to.eql([[block.variable, request.payload.input]]);
        });

        it('input is number', () => {
          const word = 1;

          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            noReplyHandler: { canHandle: sinon.stub().returns(false) },
            wordsToNumbers: sinon.stub().returns(word),
          };

          const captureHandler = CaptureGoogleHandler(utils as any);

          const block = { variable: 'var' };
          const request = { type: BaseRequest.RequestType.INTENT, payload: { input: 'input' } };
          const runtime = {
            getRequest: sinon.stub().returns(request),
            getAction: sinon.stub().returns(Action.REQUEST),
          };
          const variables = { set: sinon.stub() };

          expect(captureHandler.handle(block as any, runtime as any, variables as any, null as any)).to.eql(null);
          expect(utils.wordsToNumbers.args).to.eql([[request.payload.input]]);
          expect(variables.set.args).to.eql([[block.variable, word]]);
        });
      });
    });
  });
});
