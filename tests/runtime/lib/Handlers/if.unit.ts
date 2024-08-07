import { BaseNode, RuntimeLogs } from '@voiceflow/base-types';
import { expect } from 'chai';
import sinon from 'sinon';

import IfHandler from '@/runtime/lib/Handlers/if';
import * as Utils from '@/runtime/lib/Handlers/utils/shuntingYard';
import { EventType } from '@/runtime/lib/Lifecycle';
import DebugLogging from '@/runtime/lib/Runtime/DebugLogging';
import { getISO8601Timestamp } from '@/runtime/lib/Runtime/DebugLogging/utils';
import { mockTime } from '@/tests/lib/services/dialog/fixture';

describe('ifHandler unit tests', () => {
  const ifHandler = IfHandler();

  beforeEach(() => sinon.useFakeTimers(mockTime));

  afterEach(() => sinon.restore());

  describe('canHandle', () => {
    it('false', () => {
      expect(ifHandler.canHandle({} as any, null as any, null as any, null as any)).to.eql(false);
      expect(
        ifHandler.canHandle({ type: BaseNode.NodeType.IF_V2 } as any, null as any, null as any, null as any)
      ).to.eql(false);
    });

    it('true', () => {
      expect(ifHandler.canHandle({ expressions: ['a', 'b'] } as any, null as any, null as any, null as any)).to.eql(
        true
      );
    });
  });

  describe('handle', () => {
    afterEach(() => {
      sinon.restore();
    });

    it('evaluates to smth', async () => {
      const shuntingYardStub = sinon.stub(Utils, 'evaluateExpression');
      const evaluateError = 'evaluate-error';
      shuntingYardStub.onFirstCall().throws(evaluateError);
      shuntingYardStub.onSecondCall().resolves(5);

      const node = {
        expressions: ['first', 'second', 'third'],
        nextIds: ['first-path', 'second-path', 'third'],
        id: 'step-id',
        type: BaseNode.NodeType.IF,
      };
      const runtime = {
        trace: { debug: sinon.stub(), addTrace: sinon.stub() },
        callEvent: sinon.stub(),
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
      const variablesState = 'variables-state';
      const variables = { getState: sinon.stub().returns(variablesState) };
      const program = {
        getNode: (id: string) => ({ id, type: BaseNode.NodeType.SPEAK }),
      };

      expect(await ifHandler.handle(node as any, runtime as any, variables as any, program as any)).to.eql(
        node.nextIds[1]
      );
      expect(shuntingYardStub.args).to.eql([
        [node.expressions[0], { v: variablesState }],
        [node.expressions[1], { v: variablesState }],
      ]);

      expect(runtime.callEvent.callCount).to.eql(1);
      expect(runtime.callEvent.args[0][0]).to.eql(EventType.handlerDidCatch);
      expect(runtime.callEvent.args[0][1].error.toString()).to.eql(evaluateError);

      expect(runtime.trace.debug.args).to.eql([
        [`unable to resolve expression \`${node.expressions[0]}\`  \n\`${evaluateError}\``, BaseNode.NodeType.IF],
        ['evaluating path 2: `second` to `5`', BaseNode.NodeType.IF],
        ['condition true - taking path 2', BaseNode.NodeType.IF],
      ]);
      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: 'log',
            payload: {
              kind: 'step.condition',
              level: RuntimeLogs.LogLevel.INFO,
              message: {
                stepID: 'step-id',
                componentName: RuntimeLogs.Kinds.StepLogKind.CONDITION,
                path: {
                  stepID: 'second-path',
                  componentName: RuntimeLogs.Kinds.StepLogKind.SPEAK,
                },
              },
              timestamp: getISO8601Timestamp(),
            },
            time: mockTime,
          },
        ],
      ]);
    });

    it('evaluates to 0', async () => {
      const shuntingYardStub = sinon.stub(Utils, 'evaluateExpression');
      shuntingYardStub.onFirstCall().resolves(null as any);
      shuntingYardStub.onSecondCall().resolves(0);

      const node = {
        expressions: ['first', 'second'],
        nextIds: ['first-path', 'second-path'],
        id: 'step-id',
        type: BaseNode.NodeType.IF,
      };
      const runtime = {
        trace: { debug: sinon.stub(), addTrace: sinon.stub() },
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
      const variablesState = 'variables-state';
      const variables = { getState: sinon.stub().returns(variablesState) };
      const program = {
        getNode: (id: string) => ({ id, type: BaseNode.NodeType.SPEAK }),
      };

      expect(await ifHandler.handle(node as any, runtime as any, variables as any, program as any)).to.eql(
        node.nextIds[1]
      );
      expect(shuntingYardStub.args).to.eql([
        [node.expressions[0], { v: variablesState }],
        [node.expressions[1], { v: variablesState }],
      ]);

      expect(runtime.trace.debug.args).to.eql([
        ['evaluating path 1: `first` to `undefined`', BaseNode.NodeType.IF],
        ['evaluating path 2: `second` to `0`', BaseNode.NodeType.IF],
        ['condition true - taking path 2', BaseNode.NodeType.IF],
      ]);
      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: 'log',
            payload: {
              kind: 'step.condition',
              level: RuntimeLogs.LogLevel.INFO,
              message: {
                stepID: 'step-id',
                componentName: RuntimeLogs.Kinds.StepLogKind.CONDITION,
                path: {
                  stepID: 'second-path',
                  componentName: RuntimeLogs.Kinds.StepLogKind.SPEAK,
                },
              },
              timestamp: getISO8601Timestamp(),
            },
            time: mockTime,
          },
        ],
      ]);
    });

    describe('cant evaluate', () => {
      afterEach(() => {
        sinon.restore();
      });

      it('with elseId', async () => {
        sinon.stub(Utils, 'evaluateExpression').resolves(null as any);

        const node = {
          expressions: ['first'],
          nextIds: ['first-path'],
          elseId: 'else-id',
          id: 'step-id',
          type: BaseNode.NodeType.IF,
        };
        const runtime = {
          trace: { debug: sinon.stub(), addTrace: sinon.stub() },
          debugLogging: null as unknown as DebugLogging,
        };
        runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
        const variables = { getState: sinon.stub().returns({}) };
        const program = {
          getNode: (id: string) => ({ id, type: BaseNode.NodeType.SPEAK }),
        };

        expect(await ifHandler.handle(node as any, runtime as any, variables as any, program as any)).to.eql(
          node.elseId
        );

        expect(runtime.trace.debug.args).to.eql([
          ['evaluating path 1: `first` to `undefined`', BaseNode.NodeType.IF],
          ['no conditions matched - taking else path', BaseNode.NodeType.IF],
        ]);
        expect(runtime.trace.addTrace.args).to.eql([
          [
            {
              type: 'log',
              payload: {
                kind: 'step.condition',
                level: RuntimeLogs.LogLevel.INFO,
                message: {
                  stepID: 'step-id',
                  componentName: RuntimeLogs.Kinds.StepLogKind.CONDITION,
                  path: {
                    stepID: 'else-id',
                    componentName: RuntimeLogs.Kinds.StepLogKind.SPEAK,
                  },
                },
                timestamp: getISO8601Timestamp(),
              },
              time: mockTime,
            },
          ],
        ]);
      });

      it('without elseId', async () => {
        sinon.stub(Utils, 'evaluateExpression').resolves(null as any);

        const node = { expressions: ['first'], nextIds: ['first-path'], id: 'step-id', type: BaseNode.NodeType.IF };
        const runtime = {
          trace: { debug: sinon.stub(), addTrace: sinon.stub() },
          debugLogging: null as unknown as DebugLogging,
        };
        runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
        const variables = { getState: sinon.stub().returns({}) };
        const program = {
          getNode: (id: string) => ({ id, type: BaseNode.NodeType.SPEAK }),
        };

        expect(await ifHandler.handle(node as any, runtime as any, variables as any, program as any)).to.eql(null);

        expect(runtime.trace.debug.args).to.eql([
          ['evaluating path 1: `first` to `undefined`', BaseNode.NodeType.IF],
          ['no conditions matched - taking else path', BaseNode.NodeType.IF],
        ]);
        expect(runtime.trace.addTrace.args).to.eql([
          [
            {
              type: 'log',
              payload: {
                kind: 'step.condition',
                level: RuntimeLogs.LogLevel.INFO,
                message: {
                  stepID: 'step-id',
                  componentName: RuntimeLogs.Kinds.StepLogKind.CONDITION,
                  path: null,
                },
                timestamp: getISO8601Timestamp(),
              },
              time: mockTime,
            },
          ],
        ]);
      });
    });
  });
});
