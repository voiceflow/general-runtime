/* eslint-disable max-nested-callbacks */
import { CommandType } from '@voiceflow/general-types';
import { Action } from '@voiceflow/runtime';
import { expect } from 'chai';
import sinon from 'sinon';

import { CommandHandler, getCommand as GetCommand } from '@/lib/services/runtime/handlers/command';
import { FrameType } from '@/lib/services/runtime/types';

describe('Command handler', () => {
  describe('getCommand', () => {
    it('returns null', () => {
      const runtime = { stack: [] };
      const extractFrame = sinon.stub().returns(undefined);
      expect(GetCommand(runtime as any, extractFrame)).to.eql(null);
      expect(extractFrame.callCount).to.eql(1);
      expect(extractFrame.args[0].length).to.eql(2);
      expect(extractFrame.args[0][0]).to.eql(runtime.stack);
      expect(typeof extractFrame.args[0][1]).to.eql('function');
    });

    it('returns frame', () => {
      const frame = {};
      const runtime = { stack: [] };
      const extractFrame = sinon.stub().returns(frame);
      expect(GetCommand(runtime as any, extractFrame)).to.eql(frame);
      expect(extractFrame.callCount).to.eql(1);
      expect(extractFrame.args[0].length).to.eql(2);
      expect(extractFrame.args[0][0]).to.eql(runtime.stack);
      expect(typeof extractFrame.args[0][1]).to.eql('function');
    });
  });

  describe('canHandle', () => {
    it('false', () => {
      const getCommand = sinon.stub().returns(null);
      const runtime = {};

      expect(CommandHandler({ getCommand } as any).canHandle(runtime as any)).to.eql(false);
      expect(getCommand.args).to.eql([[runtime]]);
    });

    it('true', () => {
      const getCommand = sinon.stub().returns({});
      const runtime = {};

      expect(CommandHandler({ getCommand } as any).canHandle(runtime as any)).to.eql(true);
      expect(getCommand.args).to.eql([[runtime]]);
    });
  });

  describe('handle', () => {
    describe('command type other', () => {
      it('with matcher', () => {
        const commandObj = { event: { foo: 'bar' } };
        const sideEffectStub = sinon.stub();
        const utils = {
          findEventMatcher: sinon.stub().returns({ sideEffect: sideEffectStub }),
          getCommand: sinon.stub().returns({ command: commandObj }),
        };
        const handler = CommandHandler(utils as any);

        const runtime = { setAction: sinon.stub() };
        const variables = { var1: 'val1' };

        expect(handler.handle(runtime as any, variables as any)).to.eql(null);
        expect(utils.getCommand.args).to.eql([[runtime]]);
        expect(runtime.setAction.args).to.eql([[Action.RESPONSE]]);
        expect(utils.findEventMatcher.args).to.eql([[{ event: commandObj.event, runtime, variables }]]);
        expect(sideEffectStub.callCount).to.eql(1);
      });

      it('no matcher', () => {
        const commandObj = { event: { foo: 'bar' } };
        const utils = {
          findEventMatcher: sinon.stub().returns(null),
          getCommand: sinon.stub().returns({ command: commandObj }),
        };
        const handler = CommandHandler(utils as any);

        const runtime = { setAction: sinon.stub() };
        const variables = { var1: 'val1' };

        expect(handler.handle(runtime as any, variables as any)).to.eql(null);
        expect(utils.getCommand.args).to.eql([[runtime]]);
        expect(runtime.setAction.args).to.eql([[Action.RESPONSE]]);
        expect(utils.findEventMatcher.args).to.eql([[{ event: commandObj.event, runtime, variables }]]);
      });
    });

    describe('command type jump', () => {
      it('no top of stack', () => {
        const commandObj = { event: { foo: 'bar' }, type: CommandType.JUMP, nextID: 'next-id' };
        const index = 1;
        const sideEffectStub = sinon.stub();
        const utils = {
          findEventMatcher: sinon.stub().returns({ sideEffect: sideEffectStub }),
          getCommand: sinon.stub().returns({ command: commandObj, index }),
        };
        const handler = CommandHandler(utils as any);

        const setNodeID = sinon.stub();
        const runtime = {
          setAction: sinon.stub(),
          stack: { getSize: sinon.stub().returns(3), popTo: sinon.stub(), top: sinon.stub().returns({ setNodeID }) },
          trace: { debug: sinon.stub() },
        };
        const variables = { var1: 'val1' };

        expect(handler.handle(runtime as any, variables as any)).to.eql(null);
        expect(utils.getCommand.args).to.eql([[runtime]]);
        expect(runtime.setAction.args).to.eql([[Action.RESPONSE]]);
        expect(utils.findEventMatcher.args).to.eql([[{ event: commandObj.event, runtime, variables }]]);
        expect(sideEffectStub.callCount).to.eql(1);
        expect(runtime.stack.getSize.callCount).to.eql(2);
        expect(runtime.stack.popTo.args).to.eql([[index + 1]]);
        expect(setNodeID.args).to.eql([[commandObj.nextID]]);
        expect(runtime.trace.debug.args).to.eql([[`matched command **${commandObj.type}** - exiting flows and jumping to node`]]);
      });

      describe('top of stack', () => {
        it('with nextID', () => {
          const commandObj = { event: { foo: 'bar' }, type: CommandType.JUMP, nextID: 'next-id' };
          const index = 2;
          const sideEffectStub = sinon.stub();
          const utils = {
            findEventMatcher: sinon.stub().returns({ sideEffect: sideEffectStub }),
            getCommand: sinon.stub().returns({ command: commandObj, index }),
          };
          const handler = CommandHandler(utils as any);

          const runtime = {
            setAction: sinon.stub(),
            stack: { getSize: sinon.stub().returns(3) },
            trace: { debug: sinon.stub() },
          };
          const variables = { var1: 'val1' };

          expect(handler.handle(runtime as any, variables as any)).to.eql(commandObj.nextID);
          expect(utils.getCommand.args).to.eql([[runtime]]);
          expect(runtime.setAction.args).to.eql([[Action.RESPONSE]]);
          expect(utils.findEventMatcher.args).to.eql([[{ event: commandObj.event, runtime, variables }]]);
          expect(sideEffectStub.callCount).to.eql(1);
          expect(runtime.stack.getSize.callCount).to.eql(2);
          expect(runtime.trace.debug.args).to.eql([[`matched command **${commandObj.type}** - jumping to node`]]);
        });

        it('no nextID', () => {
          const commandObj = { event: { foo: 'bar' }, type: CommandType.JUMP };
          const index = 2;
          const sideEffectStub = sinon.stub();
          const utils = {
            findEventMatcher: sinon.stub().returns({ sideEffect: sideEffectStub }),
            getCommand: sinon.stub().returns({ command: commandObj, index }),
          };
          const handler = CommandHandler(utils as any);

          const runtime = {
            setAction: sinon.stub(),
            stack: { getSize: sinon.stub().returns(3) },
            trace: { debug: sinon.stub() },
          };
          const variables = { var1: 'val1' };

          expect(handler.handle(runtime as any, variables as any)).to.eql(null);
          expect(utils.getCommand.args).to.eql([[runtime]]);
          expect(runtime.setAction.args).to.eql([[Action.RESPONSE]]);
          expect(utils.findEventMatcher.args).to.eql([[{ event: commandObj.event, runtime, variables }]]);
          expect(sideEffectStub.callCount).to.eql(1);
          expect(runtime.stack.getSize.callCount).to.eql(2);
          expect(runtime.trace.debug.args).to.eql([[`matched command **${commandObj.type}** - jumping to node`]]);
        });
      });
    });

    describe('command type push', () => {
      it('no diagramID', () => {
        const commandObj = { event: { foo: 'bar' }, type: CommandType.PUSH };
        const sideEffectStub = sinon.stub();
        const utils = {
          findEventMatcher: sinon.stub().returns({ sideEffect: sideEffectStub }),
          getCommand: sinon.stub().returns({ command: commandObj }),
        };
        const handler = CommandHandler(utils as any);

        const runtime = { setAction: sinon.stub() };
        const variables = { var1: 'val1' };

        expect(handler.handle(runtime as any, variables as any)).to.eql(null);
        expect(utils.getCommand.args).to.eql([[runtime]]);
        expect(runtime.setAction.args).to.eql([[Action.RESPONSE]]);
        expect(utils.findEventMatcher.args).to.eql([[{ event: commandObj.event, runtime, variables }]]);
        expect(sideEffectStub.callCount).to.eql(1);
      });

      it('with diagramID', () => {
        const commandObj = { event: { foo: 'bar' }, type: CommandType.PUSH, diagramID: 'diagram-id' };
        const sideEffectStub = sinon.stub();
        const utils = {
          findEventMatcher: sinon.stub().returns({ sideEffect: sideEffectStub }),
          getCommand: sinon.stub().returns({ command: commandObj }),
          Frame: sinon.stub(),
        };
        const handler = CommandHandler(utils as any);

        const storageSetStub = sinon.stub();
        const runtime = {
          setAction: sinon.stub(),
          stack: { top: sinon.stub().returns({ storage: { set: storageSetStub } }), push: sinon.stub() },
          trace: { debug: sinon.stub() },
        };
        const variables = { var1: 'val1' };

        expect(handler.handle(runtime as any, variables as any)).to.eql(null);
        expect(utils.getCommand.args).to.eql([[runtime]]);
        expect(runtime.setAction.args).to.eql([[Action.RESPONSE]]);
        expect(utils.findEventMatcher.args).to.eql([[{ event: commandObj.event, runtime, variables }]]);
        expect(sideEffectStub.callCount).to.eql(1);
        expect(runtime.trace.debug.args).to.eql([[`matched command **${commandObj.type}** - adding command flow`]]);
        expect(storageSetStub.args).to.eql([[FrameType.CALLED_COMMAND, true]]);
        expect(utils.Frame.args).to.eql([[{ programID: commandObj.diagramID }]]);
        expect(runtime.stack.push.args).to.eql([[{}]]);
      });
    });
  });
});
