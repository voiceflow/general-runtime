import { expect } from 'chai';
import sinon from 'sinon';

import { _V1Handler } from '@/lib/services/runtime/handlers/_v1';
import { TurnType } from '@/lib/services/runtime/types';
import { Action } from '@/runtime';

describe('_v1 handler unit tests', () => {
  describe('canHandle', () => {
    it('false', () => {
      expect(_V1Handler({} as any).canHandle({} as any, null as any, null as any, null as any)).to.eql(false);
      expect(_V1Handler({} as any).canHandle({ _v: 2 } as any, null as any, null as any, null as any)).to.eql(false);
    });

    it('true', () => {
      expect(_V1Handler({} as any).canHandle({ _v: 1 } as any, null as any, null as any, null as any)).to.eql(true);
    });
  });

  describe('handle', () => {
    describe('action not request', () => {
      describe('stop true', () => {
        it('works', () => {
          const node = {
            id: 'node-id',
            type: 'trace {var1}',
            stop: true,
            payload: "{ foo: 'bar {var1}' }",
            paths: [
              { event: {}, label: 'label1', nextID: '1' },
              { event: {}, nextID: '2' },
            ],
          };
          const runtime = {
            getAction: sinon.stub().returns(Action.RUNNING),
            trace: { addTrace: sinon.stub() },
            turn: { get: sinon.stub().returns(null) },
          };
          const handler = _V1Handler({} as any);
          const variables = { getState: sinon.stub().returns({ var1: 'variable1' }) };

          expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.id);
          expect(runtime.trace.addTrace.args).to.eql([
            [
              {
                type: 'trace variable1',
                payload: "{ foo: 'bar variable1' }",
                paths: [
                  { event: {}, label: 'label1' },
                  { event: {}, label: undefined },
                ],
                defaultPath: undefined,
              },
            ],
          ]);
          expect(runtime.turn.get.args).to.eql([[TurnType.STOP_TYPES], [TurnType.STOP_ALL]]);
        });

        it('works with stop types', () => {
          const node = {
            id: 'node-id',
            type: 'the trace block',
            stop: false, // will be overriden by stop types
            payload: { foo: 'bar' },
            paths: [
              { event: {}, nextID: '1' },
              { event: {}, nextID: '2' },
            ],
          };
          const runtime = {
            getAction: sinon.stub().returns(Action.RUNNING),
            trace: { addTrace: sinon.stub() },
            turn: { get: sinon.stub().returns(['type1', 'the trace block', 'type3']) },
          };
          const handler = _V1Handler({} as any);
          const variables = { getState: sinon.stub().returns({}) };

          expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(node.id);
          expect(runtime.trace.addTrace.args).to.eql([
            [
              {
                type: node.type,
                payload: node.payload,
                paths: [
                  { event: {}, label: undefined },
                  { event: {}, label: undefined },
                ],
                defaultPath: undefined,
              },
            ],
          ]);
          expect(runtime.turn.get.args).to.eql([[TurnType.STOP_TYPES], [TurnType.STOP_ALL]]);
        });
      });

      describe('stop false', () => {
        it('no default path', () => {
          const node = {
            id: 'node-id',
            type: 'trace',
            stop: false,
            payload: { foo: 'bar' },
            paths: [
              { event: {}, nextID: '1' },
              { event: {}, nextID: '2' },
            ],
          };
          const runtime = {
            getAction: sinon.stub().returns(Action.RUNNING),
            trace: { addTrace: sinon.stub() },
            turn: { get: sinon.stub().returns(undefined) },
          };
          const handler = _V1Handler({} as any);
          const variables = { getState: sinon.stub().returns({}) };

          expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
          expect(runtime.trace.addTrace.args).to.eql([
            [
              {
                type: node.type,
                payload: node.payload,
                paths: [
                  { event: {}, label: undefined },
                  { event: {}, label: undefined },
                ],
                defaultPath: undefined,
              },
            ],
          ]);
          expect(runtime.turn.get.args).to.eql([[TurnType.STOP_TYPES], [TurnType.STOP_ALL]]);
        });

        it('no port for default path', () => {
          const node = {
            id: 'node-id',
            type: 'trace',
            stop: false,
            payload: { foo: 'bar' },
            defaultPath: 3,
            paths: [
              { event: {}, nextID: '1' },
              { event: {}, nextID: '2' },
            ],
          };
          const runtime = {
            getAction: sinon.stub().returns(Action.RUNNING),
            trace: { addTrace: sinon.stub() },
            turn: { get: sinon.stub().returns(null) },
          };
          const handler = _V1Handler({} as any);
          const variables = { getState: sinon.stub().returns({}) };

          expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
          expect(runtime.trace.addTrace.args).to.eql([
            [
              {
                type: node.type,
                payload: node.payload,
                paths: [
                  { event: {}, label: undefined },
                  { event: {}, label: undefined },
                ],
                defaultPath: node.defaultPath,
              },
            ],
          ]);
          expect(runtime.turn.get.args).to.eql([[TurnType.STOP_TYPES], [TurnType.STOP_ALL]]);
        });

        it('return default port', () => {
          const node = {
            id: 'node-id',
            type: 'trace',
            stop: false,
            payload: { foo: 'bar' },
            defaultPath: 1,
            paths: [
              { event: { name: 'event1' }, nextID: '1' },
              { event: {}, nextID: '2' },
            ],
          };
          const runtime = {
            getAction: sinon.stub().returns(Action.RUNNING),
            trace: { addTrace: sinon.stub() },
            turn: { get: sinon.stub().returns(false) },
          };
          const handler = _V1Handler({} as any);
          const variables = { getState: sinon.stub().returns({}) };

          expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql('2');
          expect(runtime.trace.addTrace.args).to.eql([
            [
              {
                type: node.type,
                payload: node.payload,
                paths: [
                  { event: { name: 'event1' }, label: undefined },
                  { event: {}, label: undefined },
                ],
                defaultPath: node.defaultPath,
              },
            ],
          ]);
          expect(runtime.turn.get.args).to.eql([[TurnType.STOP_TYPES], [TurnType.STOP_ALL]]);
        });
      });
    });

    describe('action request', () => {
      it('no match', () => {
        const node = {
          id: 'node-id',
          type: 'trace',
          stop: true,
          data: { foo: 'bar' },
          paths: [],
        };
        const commandHandler = { canHandle: sinon.stub().returns(false) };
        const runtime = {
          getAction: sinon.stub().returns(Action.REQUEST),
          trace: { addTrace: sinon.stub() },
        };
        const handler = _V1Handler({ commandHandler } as any);

        expect(handler.handle(node as any, runtime as any, null as any, null as any)).to.eql(null);
        expect(commandHandler.canHandle.args).to.eql([[runtime]]);
      });

      it('command match', () => {
        const node = {
          id: 'node-id',
          type: 'trace',
          stop: true,
          data: { foo: 'bar' },
          paths: [{ event: {}, nextID: 'next-id' }],
        };
        const commandHandler = { canHandle: sinon.stub().returns(true), handle: sinon.stub().returns('command-id') };
        const findEventMatcher = sinon.stub().returns(null);
        const runtime = {
          getAction: sinon.stub().returns(Action.REQUEST),
          trace: { addTrace: sinon.stub() },
        };
        const variables = { getState: sinon.stub().returns({ var1: 'val1' }) };
        const handler = _V1Handler({ commandHandler, findEventMatcher } as any);

        expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql('command-id');
        expect(commandHandler.canHandle.args).to.eql([[runtime]]);
        expect(commandHandler.handle.args).to.eql([[runtime, variables]]);
        expect(findEventMatcher.args).to.eql([[{ event: node.paths[0].event, runtime }]]);
      });

      it('path match', () => {
        const node = {
          id: 'node-id',
          type: 'trace',
          stop: true,
          data: { foo: 'bar' },
          paths: [
            { event: { name: 'event1' }, nextID: 'next-id' },
            { event: { name: 'event2' }, nextID: 'next-id2' },
          ],
        };
        const matcher = { sideEffect: sinon.stub() };
        const findEventMatcher = sinon.stub().onFirstCall().returns(null).onSecondCall().returns(matcher);
        const runtime = {
          getAction: sinon.stub().returns(Action.REQUEST),
          trace: { addTrace: sinon.stub() },
        };
        const variables = { getState: sinon.stub().returns({ var1: 'val1' }) };
        const handler = _V1Handler({ findEventMatcher } as any);

        expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql('next-id2');
        expect(findEventMatcher.args).to.eql([[{ event: node.paths[0].event, runtime }], [{ event: node.paths[1].event, runtime }]]);
        expect(matcher.sideEffect.args).to.eql([[variables]]);
      });

      it('path match but no nextID', () => {
        const node = {
          id: 'node-id',
          type: 'trace',
          stop: true,
          data: { foo: 'bar' },
          paths: [{ event: { name: 'event1' }, nextID: 'next-id' }, { event: { name: 'event2' } }],
        };
        const matcher = { sideEffect: sinon.stub() };
        const findEventMatcher = sinon.stub().onFirstCall().returns(null).onSecondCall().returns(matcher);
        const runtime = {
          getAction: sinon.stub().returns(Action.REQUEST),
          trace: { addTrace: sinon.stub() },
        };
        const variables = { getState: sinon.stub().returns({ var1: 'val1' }) };
        const handler = _V1Handler({ findEventMatcher } as any);

        expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
        expect(findEventMatcher.args).to.eql([[{ event: node.paths[0].event, runtime }], [{ event: node.paths[1].event, runtime }]]);
        expect(matcher.sideEffect.args).to.eql([[variables]]);
      });
    });
  });
});
