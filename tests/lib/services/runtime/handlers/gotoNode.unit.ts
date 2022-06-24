import { BaseNode } from '@voiceflow/base-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { GoToNodeHandler } from '@/lib/services/runtime/handlers/gotoNode';

describe('GotoNode handler', () => {
  describe('canHandle', () => {
    it('false', () => {
      expect(GoToNodeHandler({} as any).canHandle({} as any, null as any, null as any, null as any)).to.eql(false);
    });

    it('true', () => {
      expect(
        GoToNodeHandler({} as any).canHandle({ type: 'goToNode' } as any, null as any, null as any, null as any)
      ).to.eql(true);
    });
  });

  describe('handle', () => {
    it('next node', () => {
      const Frame = sinon.stub().returns({ type: 'frame' });
      const handler = GoToNodeHandler({ Frame } as any);

      const node = {
        id: 'node-id',
        type: BaseNode.NodeType.GOTO_NODE,
        nextId: 'next-id',
      };

      expect(handler.handle(node as any, {} as any, {} as any, null as any)).to.eql('next-id');
    });

    it('next node within current program', () => {
      const Frame = sinon.stub().returns({ type: 'frame' });
      const handler = GoToNodeHandler({ Frame } as any);

      const node = {
        id: 'node-id',
        type: BaseNode.NodeType.GOTO_NODE,
        nextId: 'next-id',
        diagramID: 'diagramID',
      };

      const runtime = {
        stack: {
          top: sinon.stub().returns({ getProgramID: sinon.stub().returns(node.diagramID) }),
        },
      };

      expect(handler.handle(node as any, runtime as any, {} as any, null as any)).to.eql('next-id');
      expect(runtime.stack.top.callCount).to.eql(1);
    });

    it('jumps', () => {
      const frame = { type: 'frame', getName: sinon.stub().returns('name') };
      const Frame = sinon.stub().returns(frame);
      const handler = GoToNodeHandler({ Frame } as any);

      const node = {
        id: 'node-id',
        type: BaseNode.NodeType.GOTO_NODE,
        nextId: 'next-id',
        diagramID: 'diagramID',
      };

      const setNodeID = sinon.stub();

      const runtime = {
        stack: {
          top: sinon.stub().returns({ setNodeID, getProgramID: sinon.stub().returns('new') }),
          push: sinon.stub(),
          popTo: sinon.stub(),
          getFrames: sinon
            .stub()
            .returns([
              { getProgramID: sinon.stub() },
              { getProgramID: sinon.stub() },
              { getProgramID: sinon.stub().returns(node.diagramID) },
              { getProgramID: sinon.stub() },
            ]),
        },
        trace: {
          debug: sinon.stub(),
          addTrace: sinon.stub(),
        },
      };

      expect(handler.handle(node as any, runtime as any, {} as any, null as any)).to.eql(null);
      expect(runtime.stack.top.callCount).to.eql(2);
      expect(runtime.trace.addTrace.args).to.eql([
        [{ type: BaseNode.Utils.TraceType.PATH, payload: { path: 'jump' } }],
      ]);
      expect(runtime.stack.getFrames.callCount).to.eql(1);
      expect(runtime.stack.popTo.args).to.eql([[3]]);
      expect(Frame.args).to.eql([[{ programID: 'diagramID' }]]);
      expect(runtime.stack.push.args).to.eql([[frame]]);
      expect(setNodeID.args).to.eql([['next-id']]);
      expect(runtime.trace.debug.args).to.eql([['entering flow `name`', 'goToNode']]);
    });
  });
});
