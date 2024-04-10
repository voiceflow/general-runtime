import { BaseNode, RuntimeLogs, Trace } from '@voiceflow/base-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { Store } from '@/runtime';
import StartHandler from '@/runtime/lib/Handlers/start';
import DebugLogging from '@/runtime/lib/Runtime/DebugLogging';
import { getISO8601Timestamp } from '@/runtime/lib/Runtime/DebugLogging/utils';

describe('startHandler unit tests', () => {
  const startHandler = StartHandler();

  describe('canHandle', () => {
    it('false', () => {
      expect(startHandler.canHandle({} as any, null as any, null as any, null as any)).to.eql(
        false
      );
      expect(
        startHandler.canHandle(
          { start: true, nextId: null } as any,
          null as any,
          null as any,
          null as any
        )
      ).to.eql(false);
    });

    it('true', () => {
      expect(
        startHandler.canHandle(
          { start: true, nextId: 'next-id' } as any,
          null as any,
          null as any,
          null as any
        )
      ).to.eql(true);
    });
  });

  describe('handle', () => {
    it('nextId', () => {
      const node = { id: 'step-id', type: BaseNode.NodeType.START, nextId: 'next-id' };
      const runtime = {
        trace: { debug: sinon.stub(), addTrace: sinon.stub() },
        debugLogging: null as unknown as DebugLogging,
        versionID: 'version-id',
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
      const variables = new Store({ user_id: 'user-id' });

      expect(startHandler.handle(node as any, runtime as any, variables, null as any)).to.eql(
        node.nextId
      );
      expect(runtime.trace.debug.args).to.eql([['beginning flow', BaseNode.NodeType.START]]);
      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: Trace.TraceType.LOG,
            payload: {
              kind: 'global.conversation_start',
              message: {
                userID: 'user-id',
                versionID: 'version-id',
              },
              level: RuntimeLogs.LogLevel.INFO,
              timestamp: getISO8601Timestamp(),
            },
          },
        ],
        [
          {
            type: Trace.TraceType.LOG,
            payload: {
              kind: 'step.start',
              message: {
                stepID: 'step-id',
                componentName: RuntimeLogs.Kinds.StepLogKind.START,
              },
              level: RuntimeLogs.LogLevel.INFO,
              timestamp: getISO8601Timestamp(),
            },
          },
        ],
      ]);
    });

    it('no nextId', () => {
      const node = { id: 'step-id', type: BaseNode.NodeType.START };
      const runtime = {
        trace: { debug: sinon.stub(), addTrace: sinon.stub() },
        debugLogging: null as unknown as DebugLogging,
        versionID: 'version-id',
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
      const variables = new Store({ user_id: 'user-id' });

      expect(startHandler.handle(node as any, runtime as any, variables, null as any)).to.eql(null);
      expect(runtime.trace.debug.args).to.eql([['beginning flow', BaseNode.NodeType.START]]);
      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: Trace.TraceType.LOG,
            payload: {
              kind: 'global.conversation_start',
              message: {
                userID: 'user-id',
                versionID: 'version-id',
              },
              level: RuntimeLogs.LogLevel.INFO,
              timestamp: getISO8601Timestamp(),
            },
          },
        ],
        [
          {
            type: Trace.TraceType.LOG,
            payload: {
              kind: 'step.start',
              message: {
                stepID: 'step-id',
                componentName: RuntimeLogs.Kinds.StepLogKind.START,
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
