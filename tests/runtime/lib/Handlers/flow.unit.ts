import { BaseNode, RuntimeLogs } from '@voiceflow/base-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { S } from '@/runtime/lib/Constants';
import FlowHandler from '@/runtime/lib/Handlers/flow';
import DebugLogging from '@/runtime/lib/Runtime/DebugLogging';
import { getISO8601Timestamp } from '@/runtime/lib/Runtime/DebugLogging/utils';
import * as Frame from '@/runtime/lib/Runtime/Stack/Frame';
import * as Utils from '@/runtime/lib/Runtime/utils/variables';

describe('flowHandler unit tests', () => {
  const flowHandler = FlowHandler();

  describe('canHandle', () => {
    it('false', () => {
      expect(flowHandler.canHandle({} as any, null as any, null as any, null as any)).to.eql(false);
    });

    it('true', () => {
      expect(flowHandler.canHandle({ diagram_id: 'program-id' } as any, null as any, null as any, null as any)).to.eql(
        true
      );
    });
  });

  describe('handle', () => {
    afterEach(() => {
      sinon.restore();
    });

    it('no variable_map', () => {
      // stubs
      const mapStoresStub = sinon.stub(Utils, 'mapStores');
      const frameStub = sinon.stub(Frame, 'default');
      const newFrame = {
        storage: { set: sinon.stub() },
        getName: sinon.stub().returns(undefined),
        getProgramID: sinon.stub().returns('new-frame-program-id'),
        variables: 'frame-variables',
      };
      frameStub.returns(newFrame);

      const node = {
        nodeID: 'node-id',
        diagram_id: 'program-id',
        nextId: 'next-id',
        id: 'step-id',
        type: BaseNode.NodeType.FLOW,
      };
      const topFrame = {
        setNodeID: sinon.stub(),
        getName: () => 'top-frame-name',
        getProgramID: () => 'top-frame-program-id',
      };
      const runtime = {
        stack: { top: sinon.stub().returns(topFrame), push: sinon.stub() },
        trace: { debug: sinon.stub(), addTrace: sinon.stub() },
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
      const variables = {};

      // assertions
      expect(flowHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
      expect(frameStub.calledWithNew()).to.eql(true);
      expect(frameStub.args).to.eql([[{ programID: node.diagram_id }]]);
      expect(mapStoresStub.args).to.eql([[[], variables, newFrame.variables]]);
      expect(newFrame.storage.set.args).to.eql([[S.OUTPUT_MAP, undefined]]);
      expect(topFrame.setNodeID.args).to.eql([[node.nextId]]);
      expect(runtime.stack.push.args).to.eql([[newFrame]]);
      expect(runtime.trace.debug.args).to.eql([
        [`entering flow \`${newFrame.getProgramID()}\``, BaseNode.NodeType.FLOW],
      ]);
      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: 'log',
            payload: {
              kind: 'step.flow',
              level: RuntimeLogs.LogLevel.INFO,
              message: {
                stepID: 'step-id',
                componentName: RuntimeLogs.Kinds.StepLogKind.FLOW,
                flow: {
                  before: {
                    name: 'top-frame-name',
                    programID: 'top-frame-program-id',
                  },
                  after: {
                    name: null,
                    programID: 'new-frame-program-id',
                  },
                },
              },
              timestamp: getISO8601Timestamp(),
            },
          },
        ],
      ]);
    });

    it('with variable_map', () => {
      // stubs
      const mapStoresStub = sinon.stub(Utils, 'mapStores');
      const frameStub = sinon.stub(Frame, 'default');
      const newFrame = {
        storage: { set: sinon.stub() },
        getName: sinon.stub().returns('new-frame-name'),
        variables: 'frame-variables',
        getProgramID: sinon.stub().returns('new-frame-program-id'),
      };
      frameStub.returns(newFrame);

      const node = {
        nodeID: 'node-id',
        diagram_id: 'program-id',
        id: 'step-id',
        type: BaseNode.NodeType.FLOW,
        variable_map: {
          inputs: [
            ['a', 'b'],
            ['c', 'd'],
          ] as [string, string][],
          outputs: [
            ['e', 'f'],
            ['g', 'h'],
          ] as [string, string][],
        },
      };
      const topFrame = {
        setNodeID: sinon.stub(),
        getName: () => 'top-frame-name',
        getProgramID: () => 'top-frame-program-id',
      };
      const runtime = {
        stack: { top: sinon.stub().returns(topFrame), push: sinon.stub() },
        trace: { debug: sinon.stub(), addTrace: sinon.stub() },
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
      const variables = {};

      // assertions
      expect(flowHandler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
      expect(frameStub.calledWithNew()).to.eql(true);
      expect(frameStub.args).to.eql([[{ programID: node.diagram_id }]]);
      expect(mapStoresStub.args).to.eql([[node.variable_map.inputs, variables, newFrame.variables]]);
      expect(newFrame.storage.set.args).to.eql([
        [
          S.OUTPUT_MAP,
          [
            ['f', 'e'],
            ['h', 'g'],
          ],
        ],
      ]);
      expect(topFrame.setNodeID.args).to.eql([[null]]);
      expect(runtime.stack.push.args).to.eql([[newFrame]]);
      expect(runtime.trace.debug.args).to.eql([[`entering flow \`${newFrame.getName()}\``, BaseNode.NodeType.FLOW]]);
      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: 'log',
            payload: {
              kind: 'step.flow',
              level: RuntimeLogs.LogLevel.INFO,
              message: {
                stepID: 'step-id',
                componentName: RuntimeLogs.Kinds.StepLogKind.FLOW,
                flow: {
                  before: {
                    name: 'top-frame-name',
                    programID: 'top-frame-program-id',
                  },
                  after: {
                    name: 'new-frame-name',
                    programID: 'new-frame-program-id',
                  },
                },
              },
              timestamp: getISO8601Timestamp(),
            },
          },
        ],
      ]);
    });
  });
});
