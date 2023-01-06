import { BaseNode, BaseRequest, BaseTrace } from '@voiceflow/base-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import { expect } from 'chai';
import sinon from 'sinon';

// import { T } from '@/lib/constants';
// import { RequestType } from '@/lib/services/runtime/types';
import { CaptureV2AlexaHandler } from '@/lib/services/runtime/handlers/captureV2/captureV2.alexa';
import { Action } from '@/runtime';

describe('captureV2 handler unit tests', async () => {
  afterEach(() => sinon.restore());

  describe('canHandle', () => {
    it('false', () => {
      expect(CaptureV2AlexaHandler(null as any).canHandle({} as any, null as any, null as any, null as any)).to.eql(
        false
      );
    });

    it('true', () => {
      expect(
        CaptureV2AlexaHandler(null as any).canHandle(
          { type: 'captureV2', platform: VoiceflowConstants.PlatformType.ALEXA } as any,
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

      const captureHandler = CaptureV2AlexaHandler(utils as any);

      const slotName = 'slot1';
      const slotName2 = 'slot2';
      const node = { id: 'node-id', intent: { name: 'intent-name', entities: [slotName, slotName2] } };
      const runtime = {
        trace: { addTrace: sinon.stub() },
        getRequest: sinon.stub().returns({}),
        getAction: sinon.stub().returns(Action.RUNNING),
      };
      const variables = { foo: 'bar' };

      expect(captureHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.id);
      expect(utils.addRepromptIfExists.args).to.eql([[node, runtime, variables]]);
      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            payload: {
              request: {
                ELICIT: true,
                payload: {
                  entities: [],
                  intent: { name: 'intent-name' },
                  query: '',
                },
                requiredEntities: [slotName, slotName2],
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
        commandHandler: { canHandle: () => false },
        repeatHandler: { canHandle: () => false },
        addRepromptIfExists: sinon.stub(),
      };

      const captureHandler = CaptureV2AlexaHandler(utils as any);

      const node = { id: 'node-id' };
      const runtime = {
        trace: { addTrace: sinon.stub() },
        getRequest: sinon.stub().returns({ type: 'random' }),
        getAction: sinon.stub().returns(Action.RUNNING),
      };
      const variables = { foo: 'bar' };

      expect(captureHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.id);
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

        const captureHandler = CaptureV2AlexaHandler(utils as any);

        const node = { id: 'node-id' };
        const runtime = {
          trace: { addTrace: sinon.stub() },
          getRequest: sinon.stub().returns({}),
          getAction: sinon.stub().returns(Action.REQUEST),
        };
        const variables = { foo: 'bar' };

        expect(captureHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(output);
        expect(utils.commandHandler.canHandle.args).to.eql([[runtime]]);
        expect(utils.commandHandler.handle.args).to.eql([[runtime, variables]]);
      });

      describe('command cant handle', () => {
        it('local scope', () => {
          const noMatchHandler = sinon.stub().returns('no-match-path');
          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            entityFillingNoMatchHandler: { handle: sinon.stub().returns(noMatchHandler) },
            repeatHandler: { canHandle: () => false },
          };

          const captureHandler = CaptureV2AlexaHandler(utils as any);

          const node = { nextId: 'next-id', intent: {}, intentScope: BaseNode.Utils.IntentScope.NODE };
          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: { name: 'random', slots: [] } } };
          const runtime = {
            trace: { addTrace: sinon.stub() },
            getRequest: sinon.stub().returns(request),
            getAction: sinon.stub().returns(Action.REQUEST),
          };

          expect(captureHandler.handle(node as any, runtime as any, {} as any, null as any)).to.eql('no-match-path');
          expect(utils.commandHandler.canHandle.callCount).to.eql(0);
        });

        it('no match', () => {
          const noMatchHandler = sinon.stub().returns('no-match-path');
          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            entityFillingNoMatchHandler: { handle: sinon.stub().returns(noMatchHandler) },
            repeatHandler: { canHandle: () => false },
          };

          const captureHandler = CaptureV2AlexaHandler(utils as any);

          const node = { nextId: 'next-id', intent: {} };
          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: { name: 'random', slots: [] } } };
          const runtime = {
            trace: { addTrace: sinon.stub() },
            getRequest: sinon.stub().returns(request),
            getAction: sinon.stub().returns(Action.REQUEST),
          };
          const variables = { foo: 'bar' };

          expect(captureHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(
            'no-match-path'
          );
          expect(utils.entityFillingNoMatchHandler.handle.args).to.eql([[node, runtime, variables]]);
        });

        it('no match with node.intent', () => {
          const nodeID = 'node-id';
          const noMatchHandler = sinon.stub().returns(nodeID);
          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            entityFillingNoMatchHandler: { handle: sinon.stub().returns(noMatchHandler) },
            repeatHandler: { canHandle: () => false },
          };

          const captureHandler = CaptureV2AlexaHandler(utils as any);

          const slotName = 'slot1';
          const node = { id: nodeID, nextId: 'next-id', intent: { name: 'intent-name', entities: [slotName] } };
          const request = { type: BaseRequest.RequestType.INTENT, payload: { intent: {} } };
          const runtime = {
            trace: { addTrace: sinon.stub() },
            getRequest: sinon.stub().returns(request),
            getAction: sinon.stub().returns(Action.REQUEST),
          };
          const variables = { foo: 'bar' };

          expect(captureHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(nodeID);
          expect(utils.entityFillingNoMatchHandler.handle.args).to.eql([[node, runtime, variables]]);
        });

        describe('match intent', () => {
          it('query variable', () => {
            const utils = {
              commandHandler: {
                canHandle: sinon.stub().returns(false),
              },
              repeatHandler: { canHandle: sinon.stub().returns(false) },
            };

            const captureHandler = CaptureV2AlexaHandler(utils as any);

            const slotID = 'slot1';
            const node = { nextId: 'next-id', intent: { name: 'intent-name', entities: [slotID] }, variable: 'var1' };
            const request = {
              type: BaseRequest.RequestType.INTENT,
              payload: {
                intent: { name: 'intent-name', slots: { [slotID]: { name: 'slot-name', value: 'slot-value' } } },
              },
            };
            const runtime = {
              trace: { addTrace: sinon.stub() },
              getRequest: sinon.stub().returns(request),
              getAction: sinon.stub().returns(Action.REQUEST),
            };
            const variables = { set: sinon.stub() };

            expect(captureHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(
              node.nextId
            );
            expect(variables.set.args).to.eql([['var1', 'slot-value']]);
          });
        });

        it('maps intent slots', () => {
          const utils = {
            commandHandler: {
              canHandle: sinon.stub().returns(false),
            },
            repeatHandler: { canHandle: sinon.stub().returns(false) },
          };

          const captureHandler = CaptureV2AlexaHandler(utils as any);

          const slotID = 'slot_one';
          const slotID2 = 'slot_two';
          const slotID3 = 'slot_three';
          const node = { nextId: 'next-id', intent: { name: 'intent-name', entities: [slotID, slotID2] } };
          const request = {
            type: BaseRequest.RequestType.INTENT,
            payload: {
              intent: {
                name: 'intent-name',
                slots: {
                  [slotID]: { name: 'slot-name', value: 'slot-value' },
                  [slotID3]: { name: 'slot-name3', value: 'slot-value3' },
                },
              },
            },
          };
          const runtime = {
            trace: { addTrace: sinon.stub() },
            getRequest: sinon.stub().returns(request),
            getAction: sinon.stub().returns(Action.REQUEST),
          };
          const variables = { merge: sinon.stub() };

          expect(captureHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.nextId);
          expect(variables.merge.args).to.eql([[{ [slotID]: 'slot-value' }]]);
        });
      });
    });
  });
});
