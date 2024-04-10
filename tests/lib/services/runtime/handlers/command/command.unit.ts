import { BaseNode } from '@voiceflow/base-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { CommandHandler, getCommand as GetCommand } from '@/lib/services/runtime/handlers/command';
import * as EventHandler from '@/lib/services/runtime/handlers/event';
import { FrameType } from '@/lib/services/runtime/types';

const JumpPathTrace = { type: 'path', payload: { path: 'jump' } };
const PushPathTrace = { type: 'path', payload: { path: 'push' } };

describe('getCommand', () => {
  afterEach(() => {
    sinon.restore();
  });
  it('matched', () => {
    const frames = [
      { getCommands: sinon.stub().returns([{ event: 'c1' }, { event: 'c2' }]) },
      { getCommands: sinon.stub().returns([{ event: 'c3' }, { event: 'c4' }]) },
    ];
    const stack = { getFrames: sinon.stub().returns(frames) };
    const runtime = { stack, getRequest: () => 'c4' };
    sinon
      .stub(EventHandler, 'findEventMatcher')
      .callsFake((c: any) => c.event === c.runtime.getRequest() && ('matcher' as any));
    expect(GetCommand(runtime as any)).to.eql({
      index: 1,
      command: { event: 'c4' },
      match: 'matcher',
    });
  });

  it('not matched', () => {
    const stack = {
      getFrames: sinon
        .stub()
        .returns([{ getCommands: sinon.stub().returns([{ event: 'c1' }, { event: 'c2' }]) }]),
    };
    const runtime = { stack };
    sinon.stub(EventHandler, 'findEventMatcher').callsFake(() => false as any);
    expect(GetCommand(runtime as any)).to.eql(null);
  });
});

describe('Command handler', () => {
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
      const commandObj = { event: { foo: 'bar' } };
      const sideEffectStub = sinon.stub();
      const utils = {
        getCommand: sinon
          .stub()
          .returns({ command: commandObj, match: { sideEffect: sideEffectStub } }),
      };
      const handler = CommandHandler(utils as any);

      const runtime = {};
      const variables = { var1: 'val1' };

      expect(handler.handle(runtime as any, variables as any)).to.eql(null);
      expect(utils.getCommand.args).to.eql([[runtime]]);
      expect(sideEffectStub.args).to.eql([[variables]]);
    });

    describe('command type jump', () => {
      it('no top of stack', () => {
        const commandObj = {
          event: { foo: 'bar' },
          type: BaseNode.Utils.CommandType.JUMP,
          nextID: 'next-id',
        };
        const index = 1;
        const sideEffectStub = sinon.stub();
        const utils = {
          getCommand: sinon
            .stub()
            .returns({ command: commandObj, index, match: { sideEffect: sideEffectStub } }),
        };
        const handler = CommandHandler(utils as any);

        const setNodeID = sinon.stub();
        const runtime = {
          stack: {
            getSize: sinon.stub().returns(3),
            popTo: sinon.stub(),
            top: sinon.stub().returns({ setNodeID }),
          },
          trace: { debug: sinon.stub(), addTrace: sinon.stub() },
        };
        const variables = { var1: 'val1' };

        expect(handler.handle(runtime as any, variables as any)).to.eql(null);
        expect(utils.getCommand.args).to.eql([[runtime]]);
        expect(sideEffectStub.args).to.eql([[variables]]);
        expect(runtime.stack.getSize.callCount).to.eql(0);
        expect(runtime.stack.popTo.args).to.eql([[index + 1]]);
        expect(setNodeID.args).to.eql([[commandObj.nextID]]);
        expect(runtime.trace.debug.args).to.eql([
          [`matched command **${commandObj.type}** - jumping to node`, BaseNode.NodeType.COMMAND],
        ]);
        expect(runtime.trace.addTrace.args).to.eql([[JumpPathTrace]]);
      });

      describe('top of stack', () => {
        it('with nextID', () => {
          const commandObj = {
            event: { foo: 'bar' },
            type: BaseNode.Utils.CommandType.JUMP,
            nextID: 'next-id',
          };
          const index = 2;
          const sideEffectStub = sinon.stub();
          const utils = {
            getCommand: sinon
              .stub()
              .returns({ command: commandObj, index, match: { sideEffect: sideEffectStub } }),
          };
          const handler = CommandHandler(utils as any);

          const setNodeID = sinon.stub();
          const runtime = {
            stack: { popTo: sinon.stub(), top: sinon.stub().returns({ setNodeID }) },
            trace: { debug: sinon.stub(), addTrace: sinon.stub() },
          };
          const variables = { var1: 'val1' };

          expect(handler.handle(runtime as any, variables as any)).to.eql(null);
          expect(utils.getCommand.args).to.eql([[runtime]]);
          expect(sideEffectStub.args).to.eql([[variables]]);
          expect(runtime.stack.popTo.args).to.eql([[index + 1]]);
          expect(setNodeID.args).to.eql([[commandObj.nextID]]);
          expect(runtime.trace.debug.args).to.eql([
            [`matched command **${commandObj.type}** - jumping to node`, BaseNode.NodeType.COMMAND],
          ]);
          expect(runtime.trace.addTrace.args).to.eql([[JumpPathTrace]]);
        });

        it('no nextID', () => {
          const commandObj = { event: { foo: 'bar' }, type: BaseNode.Utils.CommandType.JUMP };
          const index = 2;
          const sideEffectStub = sinon.stub();
          const utils = {
            getCommand: sinon
              .stub()
              .returns({ command: commandObj, index, match: { sideEffect: sideEffectStub } }),
          };
          const handler = CommandHandler(utils as any);

          const setNodeID = sinon.stub();
          const runtime = {
            stack: { popTo: sinon.stub(), top: sinon.stub().returns({ setNodeID }) },
            trace: { debug: sinon.stub(), addTrace: sinon.stub() },
          };
          const variables = { var1: 'val1' };

          expect(handler.handle(runtime as any, variables as any)).to.eql(null);
          expect(utils.getCommand.args).to.eql([[runtime]]);
          expect(sideEffectStub.args).to.eql([[variables]]);
          expect(runtime.stack.popTo.args).to.eql([[index + 1]]);
          expect(setNodeID.args).to.eql([[null]]);
          expect(runtime.trace.debug.args).to.eql([
            [`matched command **${commandObj.type}** - jumping to node`, BaseNode.NodeType.COMMAND],
          ]);
          expect(runtime.trace.addTrace.args).to.eql([[JumpPathTrace]]);
        });
      });
    });

    describe('command type push', () => {
      it('no diagramID', () => {
        const commandObj = { event: { foo: 'bar' }, type: BaseNode.Utils.CommandType.PUSH };
        const sideEffectStub = sinon.stub();
        const utils = {
          getCommand: sinon
            .stub()
            .returns({ command: commandObj, match: { sideEffect: sideEffectStub } }),
        };
        const handler = CommandHandler(utils as any);

        const runtime = {};
        const variables = { var1: 'val1' };

        expect(handler.handle(runtime as any, variables as any)).to.eql(null);
        expect(utils.getCommand.args).to.eql([[runtime]]);
        expect(sideEffectStub.args).to.eql([[variables]]);
      });

      it('with diagramID', () => {
        const commandObj = {
          event: { foo: 'bar' },
          type: BaseNode.Utils.CommandType.PUSH,
          diagramID: 'diagram-id',
        };
        const sideEffectStub = sinon.stub();
        const utils = {
          getCommand: sinon
            .stub()
            .returns({ command: commandObj, match: { sideEffect: sideEffectStub } }),
          Frame: sinon.stub(),
        };
        const handler = CommandHandler(utils as any);

        const storageSetStub = sinon.stub();
        const runtime = {
          stack: {
            top: sinon.stub().returns({ storage: { set: storageSetStub } }),
            push: sinon.stub(),
          },
          trace: { debug: sinon.stub(), addTrace: sinon.stub() },
        };
        const variables = { var1: 'val1' };

        expect(handler.handle(runtime as any, variables as any)).to.eql(null);
        expect(utils.getCommand.args).to.eql([[runtime]]);
        expect(sideEffectStub.args).to.eql([[variables]]);
        expect(runtime.trace.debug.args).to.eql([
          [
            `matched command **${commandObj.type}** - adding command flow`,
            BaseNode.NodeType.COMMAND,
          ],
        ]);
        expect(storageSetStub.args).to.eql([[FrameType.CALLED_COMMAND, true]]);
        expect(utils.Frame.args).to.eql([[{ diagramID: commandObj.diagramID }]]);
        expect(runtime.stack.push.args).to.eql([[{}]]);
        expect(runtime.trace.addTrace.args).to.eql([[PushPathTrace]]);
      });
    });
  });
});
