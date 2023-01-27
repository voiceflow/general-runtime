/* eslint-disable @typescript-eslint/no-empty-function */
import { AlexaConstants } from '@voiceflow/alexa-types';
import { BaseNode, BaseRequest } from '@voiceflow/base-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { CommandAlexaHandler, getCommand } from '@/lib/services/runtime/handlers/command/command.alexa';
import { Action } from '@/runtime';

describe('command handler unit tests', async () => {
  afterEach(() => sinon.restore());

  describe('getCommand', () => {
    it('request type not intent', () => {
      const runtime = {
        getRequest: sinon.stub().returns({ type: 'random type' }),
        getAction: sinon.stub().returns(Action.RUNNING),
      };
      expect(getCommand(runtime as any)).to.eql(null);
    });

    describe('request type intent', () => {
      describe('intent cancel', () => {
        it('found', () => {
          const some = sinon.stub().returns(true);
          const runtime = {
            stack: { getFrames: sinon.stub().returns({ some }) },
            getRequest: sinon.stub().returns({
              type: BaseRequest.RequestType.INTENT,
              payload: { intent: { name: AlexaConstants.AmazonIntent.CANCEL } },
            }),
            getAction: sinon.stub().returns(Action.REQUEST),
          };

          expect(getCommand(runtime as any)).to.eql(null);
          expect(runtime.stack.getFrames.callCount).to.eql(2);
          expect(some.callCount).to.eql(1);
          // assert some callback
          const fn = some.args[0][0];

          const some2 = sinon.stub();
          const frame = { getCommands: sinon.stub().returns({ some: some2 }) };
          fn(frame);
          expect(frame.getCommands.callCount).to.eql(1);
          expect(typeof some2.args[0][0]).to.eql('function');
        });

        it('not found', () => {
          const request = {
            type: BaseRequest.RequestType.INTENT,
            payload: { intent: { name: AlexaConstants.AmazonIntent.CANCEL } },
          };
          const runtime = {
            stack: { getFrames: sinon.stub().returns({ some: sinon.stub().returns(false) }) },
            getRequest: sinon.stub().returns(request),
            getAction: sinon.stub().returns(Action.REQUEST),
          };

          expect(getCommand(runtime as any)).to.eql(null);
          expect(request.payload.intent.name).to.eql(AlexaConstants.AmazonIntent.STOP);
        });
      });

      it('no extracted frame', () => {
        const runtime = {
          stack: { getFrames: sinon.stub().returns([]) },
          getRequest: sinon
            .stub()
            .returns({ type: BaseRequest.RequestType.INTENT, payload: { intent: { name: 'random_intent' } } }),
          getAction: sinon.stub().returns(Action.REQUEST),
        };

        expect(getCommand(runtime as any)).to.eql(null);
      });

      it('with extracted frame', () => {
        const command = { event: { intent: 'random_intent', type: BaseRequest.RequestType.INTENT } };
        const frames = [
          {
            getCommands: sinon.stub().returns([command]),
          },
        ];
        const payload = { intent: { name: 'random_intent', slots: ['slot1', 'slot2'] } };
        const runtime = {
          stack: { getFrames: sinon.stub().returns(frames) },
          getRequest: sinon.stub().returns({ type: BaseRequest.RequestType.INTENT, payload }),
          getAction: sinon.stub().returns(Action.REQUEST),
        };
        const { index: indexRes, command: commandRes } = getCommand(runtime as any)!;
        expect(indexRes).to.eql(0);
        expect(commandRes).to.eql(command);
      });
    });
  });

  describe('canHandle', () => {
    it('false', () => {
      expect(CommandAlexaHandler({ getCommand: sinon.stub().returns(null) } as any).canHandle(null as any)).to.eql(
        false
      );
    });
    it('true', () => {
      expect(
        CommandAlexaHandler({ getCommand: sinon.stub().returns({ foo: 'bar' }) } as any).canHandle(null as any)
      ).to.eql(true);
    });
  });

  describe('handle', () => {
    describe('has command', () => {
      it('no diagram_id or next', () => {
        const commandHandler = CommandAlexaHandler({
          getCommand: sinon.stub().returns({ command: {}, match: { sideEffect: () => {} } }),
        } as any);

        const runtime = { turn: { delete: sinon.stub() } };

        expect(commandHandler.handle(runtime as any, null as any)).to.eql(null);
      });

      it('mappings but no slots', () => {
        const commandHandler = CommandAlexaHandler({
          getCommand: sinon.stub().returns({ command: { mappings: [] }, intent: {}, match: { sideEffect: () => {} } }),
        } as any);

        const runtime = { turn: { delete: sinon.stub() } };

        expect(commandHandler.handle(runtime as any, null as any)).to.eql(null);
      });

      it('slots but no mappings', () => {
        const commandHandler = CommandAlexaHandler({
          getCommand: sinon.stub().returns({ command: { intent: { slots: {} } }, match: { sideEffect: () => {} } }),
        } as any);

        const runtime = { turn: { delete: sinon.stub() } };

        expect(commandHandler.handle(runtime as any, null as any)).to.eql(null);
      });

      it('diagram_id', () => {
        const res = {
          command: { diagramID: 'diagram-id', intent: 'intent', type: BaseNode.Utils.CommandType.PUSH },
          match: { sideEffect: () => {} },
        };
        const utils = { getCommand: sinon.stub().returns(res), Frame: sinon.stub() };

        const commandHandler = CommandAlexaHandler(utils as any);

        const topFrame = { storage: { set: sinon.stub() } };
        const runtime = {
          trace: { debug: sinon.stub(), addTrace: sinon.stub() },
          stack: { push: sinon.stub(), top: sinon.stub().returns(topFrame) },
          turn: { delete: sinon.stub() },
        };

        expect(commandHandler.handle(runtime as any, null as any)).to.eql(null);
        expect(runtime.trace.debug.args).to.eql([
          [`matched command **${res.command.type}** - adding command flow`, BaseNode.NodeType.COMMAND],
        ]);
        // expect(topFrame.storage.set.args).to.eql([[F.CALLED_COMMAND, true]]);
        expect(utils.Frame.args).to.eql([[{ programID: res.command.diagramID }]]);
        expect(runtime.stack.push.args).to.eql([[{}]]);
      });

      describe('next', () => {
        it('last frame in stack', () => {
          const stackSize = 3;

          const res = {
            command: { nextID: 'next-id', intent: 'intent', type: BaseNode.Utils.CommandType.JUMP },
            index: stackSize - 1,
            match: { sideEffect: () => {} },
          };
          const utils = { getCommand: sinon.stub().returns(res) };
          const commandHandler = CommandAlexaHandler(utils as any);

          const topFrame = { setNodeID: sinon.stub() };
          const runtime = {
            trace: { debug: sinon.stub(), addTrace: sinon.stub() },
            turn: { delete: sinon.stub() },
            stack: {
              getSize: sinon.stub().returns(stackSize),
              popTo: sinon.stub(),
              top: sinon.stub().returns(topFrame),
            },
          };

          expect(commandHandler.handle(runtime as any, null as any)).to.eql(null);
          expect(runtime.trace.debug.args).to.eql([
            [`matched command **${res.command.type}** - jumping to node`, BaseNode.NodeType.COMMAND],
          ]);
          expect(topFrame.setNodeID.args).to.eql([[res.command.nextID]]);
          expect(runtime.stack.popTo.args).to.eql([[stackSize]]);
        });

        it('not last frame', () => {
          const index = 1;
          const res = {
            command: { nextID: 'next-id', intent: 'intent', type: BaseNode.Utils.CommandType.JUMP },
            index,
            match: { sideEffect: () => {} },
          };
          const utils = { getCommand: sinon.stub().returns(res) };
          const commandHandler = CommandAlexaHandler(utils as any);

          const topFrame = { setNodeID: sinon.stub() };
          const runtime = {
            trace: { debug: sinon.stub(), addTrace: sinon.stub() },
            turn: { delete: sinon.stub() },
            stack: { top: sinon.stub().returns(topFrame), popTo: sinon.stub() },
          };

          expect(commandHandler.handle(runtime as any, null as any)).to.eql(null);
          expect(runtime.stack.popTo.args).to.eql([[index + 1]]);
          expect(topFrame.setNodeID.args).to.eql([[res.command.nextID]]);
          expect(runtime.trace.debug.args).to.eql([
            [`matched command **${res.command.type}** - jumping to node`, BaseNode.NodeType.COMMAND],
          ]);
        });

        it('intent with diagramID', () => {
          const programID = 'program-id';
          const frame = { foo: 'bar' };
          const res = {
            command: {
              nextID: 'next-id',
              intent: 'intent',
              type: BaseNode.Utils.CommandType.JUMP,
              diagramID: programID,
            },
            index: 1,
            match: { sideEffect: () => {} },
          };
          const utils = { getCommand: sinon.stub().returns(res), Frame: sinon.stub().returns(frame) };
          const commandHandler = CommandAlexaHandler(utils as any);

          const topFrame = { setNodeID: sinon.stub(), getProgramID: sinon.stub().returns('different-program-id') };
          const runtime = {
            trace: { debug: sinon.stub(), addTrace: sinon.stub() },
            turn: { delete: sinon.stub() },
            stack: { top: sinon.stub().returns(topFrame), popTo: sinon.stub(), push: sinon.stub() },
          };

          expect(commandHandler.handle(runtime as any, null as any)).to.eql(null);
          expect(runtime.stack.popTo.args).to.eql([[res.index + 1]]);
          expect(topFrame.setNodeID.args).to.eql([[res.command.nextID]]);
          expect(utils.Frame.args).to.eql([[{ programID: res.command.diagramID }]]);
          expect(runtime.stack.push.args).to.eql([[frame]]);
          expect(runtime.trace.debug.args).to.eql([
            [`matched command **${res.command.type}** - jumping to node`, BaseNode.NodeType.COMMAND],
          ]);
        });
      });
    });
  });
});
