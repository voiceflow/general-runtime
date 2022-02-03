import { BaseNode } from '@voiceflow/base-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { StreamHandler } from '@/lib/services/runtime/handlers/stream';
import { StorageType, StreamAction } from '@/lib/services/runtime/types';

describe('stream handler unit tests', async () => {
  describe('canHandle', () => {
    it('false', () => {
      expect(StreamHandler(null as any).canHandle({ type: 'diff type' } as any, null as any, null as any, null as any)).to.eql(false);
      expect(StreamHandler(null as any).canHandle({ type: BaseNode.NodeType.STREAM } as any, null as any, null as any, null as any)).to.eql(false);
    });

    it('true', () => {
      expect(
        StreamHandler(null as any).canHandle({ type: BaseNode.NodeType.STREAM, src: 'url-src' } as any, null as any, null as any, null as any)
      ).to.eql(true);
    });
  });

  describe('handle', () => {
    it('no pause', () => {
      const urlSrc = 'url';
      const replaceVariablesStub = sinon.stub().returns('url');
      const handler = StreamHandler({ replaceVariables: replaceVariablesStub });

      const node = { src: 'url-src', loop: false, id: 'id', nextID: 'next-id', pauseID: 'pause-id', previousID: 'previous-id' };
      const runtime = { storage: { set: sinon.stub(), get: sinon.stub().returns(null) }, end: sinon.stub() };
      const variablesMap = { var1: 'val1', var2: 'val2' };
      const variables = { getState: sinon.stub().returns(variablesMap) };

      expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
      expect(runtime.storage.set.args).to.eql([
        [
          StorageType.STREAM_PLAY,
          {
            src: urlSrc,
            loop: node.loop,
            token: node.id,
            action: StreamAction.START,
            offset: 0,
            nodeID: node.id,
            nextID: node.nextID,
            pauseID: node.pauseID,
            previousID: node.previousID,
          },
        ],
      ]);
      expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PAUSE]]);
      expect(runtime.end.callCount).to.eql(1);
    });

    it('pause with diff id', () => {
      const urlSrc = 'url';
      const replaceVariablesStub = sinon.stub().returns('url');
      const handler = StreamHandler({ replaceVariables: replaceVariablesStub });

      const node = { src: 'url-src', loop: false, id: 'id', nextID: 'next-id', pauseID: 'pause-id', previousID: 'previous-id' };
      const runtime = { storage: { set: sinon.stub(), get: sinon.stub().returns({ id: 'id2' }), delete: sinon.stub() }, end: sinon.stub() };
      const variablesMap = { var1: 'val1', var2: 'val2' };
      const variables = { getState: sinon.stub().returns(variablesMap) };

      expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
      expect(runtime.storage.set.args).to.eql([
        [
          StorageType.STREAM_PLAY,
          {
            src: urlSrc,
            loop: node.loop,
            token: node.id,
            action: StreamAction.START,
            offset: 0,
            nodeID: node.id,
            nextID: node.nextID,
            pauseID: node.pauseID,
            previousID: node.previousID,
          },
        ],
      ]);
      expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PAUSE]]);
      expect(runtime.storage.delete.args).to.eql([[StorageType.STREAM_PAUSE]]);
      expect(runtime.end.callCount).to.eql(1);
    });

    it('pause with curr id', () => {
      const urlSrc = 'url';
      const replaceVariablesStub = sinon.stub().returns('url');
      const handler = StreamHandler({ replaceVariables: replaceVariablesStub });

      const nodeID = 'id';
      const node = { src: 'url-src', loop: false, id: nodeID, nextID: 'next-id', pauseID: 'pause-id', previousID: 'previous-id' };
      const streamPause = { id: nodeID, offset: 100 };
      const runtime = {
        storage: { set: sinon.stub(), get: sinon.stub().returns(streamPause), delete: sinon.stub(), produce: sinon.stub() },
        end: sinon.stub(),
      };
      const variablesMap = { var1: 'val1', var2: 'val2' };
      const variables = { getState: sinon.stub().returns(variablesMap) };

      expect(handler.handle(node as any, runtime as any, variables as any, null as any)).to.eql(null);
      expect(runtime.storage.set.args).to.eql([
        [
          StorageType.STREAM_PLAY,
          {
            src: urlSrc,
            loop: node.loop,
            token: node.id,
            action: StreamAction.START,
            offset: 0,
            nodeID: node.id,
            nextID: node.nextID,
            pauseID: node.pauseID,
            previousID: node.previousID,
          },
        ],
      ]);
      expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PAUSE]]);
      expect(runtime.storage.delete.args).to.eql([[StorageType.STREAM_PAUSE]]);
      expect(runtime.end.callCount).to.eql(1);

      const produceFn = runtime.storage.produce.args[0][0];
      const draft = { [StorageType.STREAM_PLAY]: {} };
      produceFn(draft);
      expect(draft).to.eql({ [StorageType.STREAM_PLAY]: { offset: streamPause.offset, action: StreamAction.PAUSE } });
    });
  });
});
