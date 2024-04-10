import { BaseNode, RuntimeLogs } from '@voiceflow/base-types';
import { expect } from 'chai';
import sinon from 'sinon';

import SetHandler from '@/runtime/lib/Handlers/set';
import * as Utils from '@/runtime/lib/Handlers/utils/shuntingYard';
import { EventType } from '@/runtime/lib/Lifecycle';
import DebugLogging from '@/runtime/lib/Runtime/DebugLogging';
import { getISO8601Timestamp } from '@/runtime/lib/Runtime/DebugLogging/utils';

describe('setHandler unit tests', () => {
  const setHandler = SetHandler();

  describe('canHandle', () => {
    it('false', () => {
      expect(setHandler.canHandle({} as any, null as any, null as any, null as any)).to.eql(false);
      expect(
        setHandler.canHandle(
          { type: BaseNode.NodeType.SET_V2 } as any,
          null as any,
          null as any,
          null as any
        )
      ).to.eql(false);
    });

    it('true', () => {
      expect(
        setHandler.canHandle({ sets: ['a', 'b'] } as any, null as any, null as any, null as any)
      ).to.eql(true);
    });
  });

  describe('handle', () => {
    afterEach(() => {
      sinon.restore();
    });

    it('with nextId', async () => {
      const shuntingYardStub = sinon.stub(Utils, 'evaluateExpression');
      shuntingYardStub.onFirstCall().resolves(null as any);
      shuntingYardStub.onSecondCall().resolves(NaN);
      shuntingYardStub.onThirdCall().resolves(5);

      const node = {
        sets: [
          { expression: '' }, // no variable
          { variable: 'v1', expression: 'v1-expression' },
          { variable: 'v2', expression: 'v2-expression' },
          { variable: 'v3', expression: 'v3-expression' },
        ],
        nextId: 'next-id',
        id: 'step-id',
        type: BaseNode.NodeType.SET,
      };
      const runtime = {
        trace: { debug: sinon.stub(), addTrace: sinon.stub() },
        callEvent: sinon.stub(),
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
      const variablesState = 'variables-state';
      const variables = {
        getState: sinon.stub().returns(variablesState),
        get: (variable: string) => {
          switch (variable) {
            case 'v1':
              return 'v1-value';
            case 'v2':
              return 'v2-value';
            case 'v3':
              return 'v3-value';
            default:
              return undefined;
          }
        },
        set: sinon.stub(),
      };

      expect(
        await setHandler.handle(node as any, runtime as any, variables as any, null as any)
      ).to.eql(node.nextId);
      expect(shuntingYardStub.args).to.eql([
        [node.sets[1].expression, { v: variablesState }],
        [node.sets[2].expression, { v: variablesState }],
        [node.sets[3].expression, { v: variablesState }],
      ]);
      expect(variables.set.args).to.eql([
        [node.sets[1].variable, null],
        [node.sets[2].variable, undefined],
        [node.sets[3].variable, 5],
      ]);
      expect(runtime.trace.debug.args).to.eql([
        [
          'unable to resolve expression `` for `{undefined}`  \n`Error: No Variable Defined`',
          BaseNode.NodeType.SET,
        ],
        ['setting `{v1}`  \nevaluating `v1-expression` to `undefined`', BaseNode.NodeType.SET],
        ['setting `{v2}`  \nevaluating `v2-expression` to `undefined`', BaseNode.NodeType.SET],
        ['setting `{v3}`  \nevaluating `v3-expression` to `5`', BaseNode.NodeType.SET],
      ]);
      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: 'log',
            payload: {
              kind: 'step.set',
              message: {
                changedVariables: {
                  v1: { before: 'v1-value', after: null },
                  v2: { before: 'v2-value', after: null },
                  v3: { before: 'v3-value', after: 5 },
                },
                stepID: 'step-id',
                componentName: RuntimeLogs.Kinds.StepLogKind.SET,
              },
              level: RuntimeLogs.LogLevel.INFO,
              timestamp: getISO8601Timestamp(),
            },
          },
        ],
      ]);
      expect(runtime.callEvent.callCount).to.eql(1);
      expect(runtime.callEvent.args[0][0]).to.eql(EventType.handlerDidCatch);
      expect(runtime.callEvent.args[0][1].error.toString()).to.eql('Error: No Variable Defined');
    });

    it('without nextId', async () => {
      const node = {
        sets: [{ expression: '' }],
        id: 'step-id',
        type: BaseNode.NodeType.SET,
      };
      const runtime = {
        trace: { debug: sinon.stub(), addTrace: sinon.stub() },
        callEvent: sinon.stub(),
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);

      expect(await setHandler.handle(node as any, runtime as any, null as any, null as any)).to.eql(
        null
      );

      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: 'log',
            payload: {
              kind: 'step.set',
              message: {
                changedVariables: {},
                stepID: 'step-id',
                componentName: RuntimeLogs.Kinds.StepLogKind.SET,
              },
              level: RuntimeLogs.LogLevel.INFO,
              timestamp: getISO8601Timestamp(),
            },
          },
        ],
      ]);
    });
  });
});
