import { BaseNode, RuntimeLogs } from '@voiceflow/base-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { S } from '@/runtime/lib/Constants';
import RandomHandler from '@/runtime/lib/Handlers/random';
import DebugLogging from '@/runtime/lib/Runtime/DebugLogging';
import { getISO8601Timestamp } from '@/runtime/lib/Runtime/DebugLogging/utils';
import Store from '@/runtime/lib/Runtime/Store';

describe('randomHandler unit tests', () => {
  const randomHandler = RandomHandler();

  describe('canHandle', () => {
    it('false', () => {
      expect(randomHandler.canHandle({} as any, null as any, null as any, null as any)).to.eql(false);
    });

    it('true', () => {
      expect(randomHandler.canHandle({ random: true } as any, null as any, null as any, null as any)).to.eql(true);
    });
  });

  describe('handle', () => {
    it('no nextIds', async () => {
      const runtime = {
        trace: { debug: sinon.stub(), addTrace: sinon.stub() },
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
      const node = { nextIds: [], id: 'step-id', type: BaseNode.NodeType.RANDOM };
      expect(await randomHandler.handle(node as any, runtime as any, null as any, null as any)).to.eql(null);
      expect(runtime.trace.debug.args).to.eql([['no random paths connected - exiting', BaseNode.NodeType.RANDOM]]);
      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: 'log',
            payload: {
              kind: 'step.random',
              message: {
                stepID: 'step-id',
                componentName: RuntimeLogs.Kinds.StepLogKind.RANDOM,
                path: null,
              },
              level: 'info',
              timestamp: getISO8601Timestamp(),
            },
          },
        ],
      ]);
    });

    it('1 nextIds', async () => {
      const runtime = {
        trace: { debug: sinon.stub(), addTrace: sinon.stub() },
        debugLogging: null as unknown as DebugLogging,
      };
      runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
      const program = {
        getNode: (id: string) => ({ id, type: BaseNode.NodeType.SPEAK }),
      };

      const id = 'next-id';
      const node = { nextIds: [id], id: 'step-id', type: BaseNode.NodeType.RANDOM };
      expect(await randomHandler.handle(node as any, runtime as any, null as any, program as any)).to.eql(id);
      expect(runtime.trace.debug.args).to.eql([['going down random path', BaseNode.NodeType.RANDOM]]);
      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: 'log',
            payload: {
              kind: 'step.random',
              message: {
                stepID: 'step-id',
                componentName: RuntimeLogs.Kinds.StepLogKind.RANDOM,
                path: {
                  stepID: id,
                  componentName: RuntimeLogs.Kinds.StepLogKind.SPEAK,
                },
              },
              level: 'info',
              timestamp: getISO8601Timestamp(),
            },
          },
        ],
      ]);
    });

    describe('many nextIds', () => {
      it('random can be repeated', async () => {
        const runtime = {
          trace: { debug: sinon.stub(), addTrace: sinon.stub() },
          debugLogging: null as unknown as DebugLogging,
        };
        runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
        const program = {
          getNode: (id: string) => ({ id, type: BaseNode.NodeType.SPEAK }),
        };

        const nextIds = ['one', 'two', 'three'];
        const node = { nextIds, id: 'step-id', type: BaseNode.NodeType.RANDOM };
        const result = await randomHandler.handle(node as any, runtime as any, null as any, program as any);
        // result is one of the ids in nextIds
        expect(nextIds.includes(result as string)).to.eql(true);
        expect(runtime.trace.debug.args).to.eql([['going down random path', BaseNode.NodeType.RANDOM]]);
        expect(runtime.trace.addTrace.args).to.eql([
          [
            {
              type: 'log',
              payload: {
                kind: 'step.random',
                message: {
                  stepID: 'step-id',
                  componentName: RuntimeLogs.Kinds.StepLogKind.RANDOM,
                  path: {
                    stepID: result!,
                    componentName: RuntimeLogs.Kinds.StepLogKind.SPEAK,
                  },
                },
                level: 'info',
                timestamp: getISO8601Timestamp(),
              },
            },
          ],
        ]);
      });

      describe('random === 2 | cannot repeat', () => {
        it('no previous choices', async () => {
          const runtime = {
            trace: { debug: sinon.stub(), addTrace: sinon.stub() },
            storage: new Store(),
            debugLogging: null as unknown as DebugLogging,
          };
          runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
          const program = {
            getNode: (id: string) => ({ id, type: BaseNode.NodeType.SPEAK }),
          };

          const nextIds = ['one', 'two', 'three'];
          const node = { id: 'step-id', nextIds, random: 2, type: BaseNode.NodeType.RANDOM };
          const result = await randomHandler.handle(node as any, runtime as any, null as any, program as any);
          // result is one of the ids in nextIds
          expect(nextIds.includes(result as string)).to.eql(true);
          expect(runtime.trace.debug.args).to.eql([['going down random path', BaseNode.NodeType.RANDOM]]);
          expect(runtime.storage.get(S.RANDOMS)[node.id]).to.eql([result]);
          expect(runtime.trace.addTrace.args).to.eql([
            [
              {
                type: 'log',
                payload: {
                  kind: 'step.random',
                  message: {
                    stepID: 'step-id',
                    componentName: RuntimeLogs.Kinds.StepLogKind.RANDOM,
                    path: {
                      stepID: result!,
                      componentName: RuntimeLogs.Kinds.StepLogKind.SPEAK,
                    },
                  },
                  level: 'info',
                  timestamp: getISO8601Timestamp(),
                },
              },
            ],
          ]);
        });

        it('only one option left', async () => {
          const nextIds = ['one', 'two', 'three'];
          const node = { id: 'step-id', nextIds, random: 2, type: BaseNode.NodeType.RANDOM };

          const runtime = {
            trace: { debug: sinon.stub(), addTrace: sinon.stub() },
            storage: new Store({ [S.RANDOMS]: { [node.id]: ['one', 'three'] } }),
            debugLogging: null as unknown as DebugLogging,
          };
          runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
          const program = {
            getNode: (id: string) => ({ id, type: BaseNode.NodeType.SPEAK }),
          };

          const result = await randomHandler.handle(node as any, runtime as any, null as any, program as any);
          // only one option possible left
          expect(result).to.eql('two');
          expect(runtime.trace.debug.args).to.eql([['going down random path', BaseNode.NodeType.RANDOM]]);
          expect(runtime.storage.get(S.RANDOMS)[node.id]).to.eql(['one', 'three', 'two']);
          expect(runtime.trace.addTrace.args).to.eql([
            [
              {
                type: 'log',
                payload: {
                  kind: 'step.random',
                  message: {
                    stepID: 'step-id',
                    componentName: RuntimeLogs.Kinds.StepLogKind.RANDOM,
                    path: {
                      stepID: 'two',
                      componentName: RuntimeLogs.Kinds.StepLogKind.SPEAK,
                    },
                  },
                  level: 'info',
                  timestamp: getISO8601Timestamp(),
                },
              },
            ],
          ]);
        });

        it('no option left', async () => {
          const nextIds = ['one', 'two', 'three'];
          const node = { id: 'step-id', nextIds, random: 2, type: BaseNode.NodeType.RANDOM };

          const runtime = {
            trace: { debug: sinon.stub(), addTrace: sinon.stub() },
            storage: new Store({ [S.RANDOMS]: { [node.id]: nextIds } }),
            debugLogging: null as unknown as DebugLogging,
          };
          runtime.debugLogging = new DebugLogging(runtime.trace.addTrace);
          const program = {
            getNode: (id: string) => ({ id, type: BaseNode.NodeType.SPEAK }),
          };

          const result = await randomHandler.handle(node as any, runtime as any, null as any, program as any);
          // result is one of the ids in nextIds
          expect(nextIds.includes(result as string)).to.eql(true);
          expect(runtime.trace.debug.args).to.eql([['going down random path', BaseNode.NodeType.RANDOM]]);
          expect(runtime.storage.get(S.RANDOMS)[node.id]).to.eql([result]);
          expect(runtime.trace.addTrace.args).to.eql([
            [
              {
                type: 'log',
                payload: {
                  kind: 'step.random',
                  message: {
                    stepID: 'step-id',
                    componentName: RuntimeLogs.Kinds.StepLogKind.RANDOM,
                    path: {
                      stepID: result!,
                      componentName: RuntimeLogs.Kinds.StepLogKind.SPEAK,
                    },
                  },
                  level: 'info',
                  timestamp: getISO8601Timestamp(),
                },
              },
            ],
          ]);
        });
      });
    });
  });
});
