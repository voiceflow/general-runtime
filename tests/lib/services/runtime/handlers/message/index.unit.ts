import { CompiledMessageNode, TraceType, Version } from '@voiceflow/dtos';
import { expect } from 'chai';
import { NodeEventHandler } from 'rxjs/internal/observable/fromEvent';
import sinon from 'sinon';

import MessageHandler from '@/lib/services/runtime/handlers/message/index';
import { Program, Runtime, Store } from '@/runtime';
import { mockMessageNode } from '@/tests/mocks/node/message.node.mock';
import { ID, mockVersion } from '@/tests/mocks/version/version.mock';

describe('Message handler', () => {
  const handler = MessageHandler();

  let version: Version;
  let runtime: Runtime;
  let variables: Store;
  let program: Program;
  let messageNode: CompiledMessageNode;
  let eventHandler: NodeEventHandler;

  beforeEach(() => {
    version = mockVersion();
    runtime = {
      version,
      trace: {
        addTrace: sinon.stub(),
      },
      debugLogging: {
        recordStepLog: sinon.stub(),
      },
    } as unknown as Runtime;

    variables = new Store({});
    program = null as unknown as Program;

    messageNode = mockMessageNode();

    eventHandler = null as unknown as NodeEventHandler;
  });

  describe('can handle', () => {
    it('does not handle - non-message node', () => {
      const data1 = mockMessageNode({
        type: 'wrong-type',
      } as any);
      const data2 = mockMessageNode({
        data: 1,
      } as any);
      const data3 = mockMessageNode({
        ports: 1,
      } as any);

      const result1 = handler.canHandle(data1, runtime, variables, program);
      const result2 = handler.canHandle(data2, runtime, variables, program);
      const result3 = handler.canHandle(data3, runtime, variables, program);

      expect(result1).to.eql(false);
      expect(result2).to.eql(false);
      expect(result3).to.eql(false);
    });

    it('handles - message node', () => {
      const messageNode = mockMessageNode();

      const result = handler.canHandle(messageNode, runtime, variables, program);

      expect(result).to.eql(true);
    });
  });

  describe('handle', () => {
    it('throws an error if version does not exist', async () => {
      delete runtime.version;

      const promise = handler.handle(messageNode, runtime, variables, program, eventHandler);

      await expect(promise).to.eventually.rejectedWith(`[message-handler]: Runtime was not loaded with a version`);
    });

    it('throws an error if programResources does not exist', async () => {
      delete version.programResources;

      const promise = handler.handle(messageNode, runtime, variables, program, eventHandler);

      await expect(promise).to.eventually.rejectedWith(`[message-handler]: Version was not compiled`);
    });

    it('throws an error if variants does not exist', async () => {
      delete version.programResources!.messages[ID.messageID].variants['default:en-us'];

      const promise = handler.handle(messageNode, runtime, variables, program, eventHandler);

      await expect(promise).to.eventually.rejectedWith(
        `[message-handler]: could not resolve message step, missing variants list for 'default:en-us'`
      );
    });

    it('outputs text trace for each text variant', async () => {
      const result = await handler.handle(messageNode, runtime, variables, program, eventHandler);

      await expect(result).to.eql(messageNode.ports.default);
      await expect((runtime.trace.addTrace as sinon.SinonStub).callCount).to.eql(1);

      const addTraceArgs = (runtime.trace.addTrace as sinon.SinonStub).args[0][0];
      delete addTraceArgs.payload.slate.id;
      await expect(addTraceArgs).to.eql({
        type: TraceType.TEXT,
        payload: {
          delay: 100,
          message: 'Hello, world!',
          slate: {
            content: [
              {
                text: 'Hello, world!',
              },
            ],
            messageDelayMilliseconds: 100,
          },
        },
      });
    });
  });
});
