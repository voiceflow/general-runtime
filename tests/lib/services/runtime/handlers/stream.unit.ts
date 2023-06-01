import { BaseNode } from '@voiceflow/base-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { StreamHandler } from '@/lib/services/runtime/handlers/stream';
import { StorageType, StreamAction } from '@/lib/services/runtime/types';

describe('stream handler unit tests', async () => {
  describe('canHandle', () => {
    it('false', () => {
      expect(
        StreamHandler(null as any).canHandle({ type: 'diff type' } as any, null as any, null as any, null as any)
      ).to.eql(false);
      expect(
        StreamHandler(null as any).canHandle(
          { type: BaseNode.NodeType.STREAM } as any,
          null as any,
          null as any,
          null as any
        )
      ).to.eql(false);
    });

    it('true', () => {
      expect(
        StreamHandler(null as any).canHandle(
          { type: BaseNode.NodeType.STREAM, src: 'url-src' } as any,
          null as any,
          null as any,
          null as any
        )
      ).to.eql(true);
    });
  });

  describe('handle', () => {
    it('no pause', () => {
      const urlSrc = 'url';
      const replaceVariablesStub = (value: any) => {
        if (value === node.src) return urlSrc;
        return value;
      };

      const handler = StreamHandler({ replaceVariables: replaceVariablesStub });

      const node = {
        src: 'url-src',
        loop: false,
        id: 'id',
        nextID: 'next-id',
        pauseID: 'pause-id',
        previousID: 'previous-id',
        backgroundImage: 'background-image',
        description: 'description',
        iconImage: 'icon-image',
        title: 'title',
      };
      const runtime = {
        storage: { set: sinon.stub(), get: sinon.stub().returns(null) },
        trace: { addTrace: sinon.stub() },
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
            backgroundImage: node.backgroundImage,
            description: node.description,
            iconImage: node.iconImage,
            title: node.title,
          },
        ],
      ]);
      expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PAUSE]]);
      expect(runtime.trace.addTrace.args[0][0]).to.eql({
        type: BaseNode.Utils.TraceType.STREAM,
        payload: {
          src: urlSrc,
          token: node.id,
          action: BaseNode.Stream.TraceStreamAction.PLAY,
          loop: node.loop,
          description: node.description,
          title: node.title,
          iconImage: node.iconImage,
          backgroundImage: node.backgroundImage,
        },
      });
      expect(runtime.end.callCount).to.eql(1);
    });

    it('pause with diff id', () => {
      const urlSrc = 'url';
      const replaceVariablesStub = (value: any) => {
        if (value === node.src) return urlSrc;
        return value;
      };
      const handler = StreamHandler({ replaceVariables: replaceVariablesStub });

      const node = {
        src: 'url-src',
        loop: false,
        id: 'id',
        nextID: 'next-id',
        pauseID: 'pause-id',
        previousID: 'previous-id',
        backgroundImage: 'background-image',
        description: 'description',
        iconImage: 'icon-image',
        title: 'title',
      };
      const runtime = {
        storage: { set: sinon.stub(), get: sinon.stub().returns({ id: 'id2' }), delete: sinon.stub() },
        trace: { addTrace: sinon.stub() },
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
            backgroundImage: node.backgroundImage,
            description: node.description,
            iconImage: node.iconImage,
            title: node.title,
          },
        ],
      ]);
      expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PAUSE]]);
      expect(runtime.storage.delete.args).to.eql([[StorageType.STREAM_PAUSE]]);
      expect(runtime.trace.addTrace.args[0][0]).to.eql({
        type: BaseNode.Utils.TraceType.STREAM,
        payload: {
          src: urlSrc,
          token: node.id,
          action: BaseNode.Stream.TraceStreamAction.PLAY,
          loop: node.loop,
          description: node.description,
          title: node.title,
          iconImage: node.iconImage,
          backgroundImage: node.backgroundImage,
        },
      });
      expect(runtime.end.callCount).to.eql(1);
    });

    it('pause with curr id', () => {
      const urlSrc = 'url';
      const replaceVariablesStub = (value: any) => {
        if (value === node.src) return urlSrc;
        return value;
      };
      const handler = StreamHandler({ replaceVariables: replaceVariablesStub });

      const nodeID = 'id';
      const node = {
        src: 'url-src',
        loop: false,
        id: nodeID,
        nextID: 'next-id',
        pauseID: 'pause-id',
        previousID: 'previous-id',
        backgroundImage: 'background-image',
        description: 'description',
        iconImage: 'icon-image',
        title: 'title',
      };
      const streamPause = { id: nodeID, offset: 100 };
      const runtime = {
        storage: {
          set: sinon.stub(),
          get: sinon.stub().returns(streamPause),
          delete: sinon.stub(),
        },
        trace: { addTrace: sinon.stub() },
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
            action: StreamAction.PAUSE,
            offset: streamPause.offset,
            nodeID: node.id,
            nextID: node.nextID,
            pauseID: node.pauseID,
            previousID: node.previousID,
            backgroundImage: node.backgroundImage,
            description: node.description,
            iconImage: node.iconImage,
            title: node.title,
          },
        ],
      ]);
      expect(runtime.storage.get.args).to.eql([[StorageType.STREAM_PAUSE]]);
      expect(runtime.storage.delete.args).to.eql([[StorageType.STREAM_PAUSE]]);
      expect(runtime.end.callCount).to.eql(1);

      expect(runtime.trace.addTrace.args[0][0]).to.eql({
        type: BaseNode.Utils.TraceType.STREAM,
        payload: {
          src: urlSrc,
          token: node.id,
          action: BaseNode.Stream.TraceStreamAction.PAUSE,
          loop: node.loop,
          description: node.description,
          title: node.title,
          iconImage: node.iconImage,
          backgroundImage: node.backgroundImage,
        },
      });
    });
  });
});
