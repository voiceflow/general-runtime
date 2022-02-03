import { BaseNode } from '@voiceflow/base-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { S } from '@/runtime/lib/Constants';
import RandomHandler from '@/runtime/lib/Handlers/random';
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
      const runtime = { trace: { debug: sinon.stub() } };
      expect(await randomHandler.handle({ nextIds: [] } as any, runtime as any, null as any, null as any)).to.eql(null);
      expect(runtime.trace.debug.args).to.eql([['no random paths connected - exiting', BaseNode.NodeType.RANDOM]]);
    });

    it('1 nextIds', async () => {
      const runtime = { trace: { debug: sinon.stub() } };
      const id = 'next-id';
      expect(await randomHandler.handle({ nextIds: [id] } as any, runtime as any, null as any, null as any)).to.eql(id);
      expect(runtime.trace.debug.args).to.eql([['going down random path', BaseNode.NodeType.RANDOM]]);
    });

    describe('many nextIds', () => {
      it('random can be repeated', async () => {
        const runtime = { trace: { debug: sinon.stub() } };
        const nextIds = ['one', 'two', 'three'];
        const result = await randomHandler.handle({ nextIds } as any, runtime as any, null as any, null as any);
        // result is one of the ids in nextIds
        expect(nextIds.includes(result as string)).to.eql(true);
        expect(runtime.trace.debug.args).to.eql([['going down random path', BaseNode.NodeType.RANDOM]]);
      });

      describe('random === 2 | cannot repeat', () => {
        it('no previous choices', async () => {
          const runtime = { trace: { debug: sinon.stub() }, storage: new Store() };
          const nextIds = ['one', 'two', 'three'];
          const node = { id: 'node-id', nextIds, random: 2 };
          const result = await randomHandler.handle(node as any, runtime as any, null as any, null as any);
          // result is one of the ids in nextIds
          expect(nextIds.includes(result as string)).to.eql(true);
          expect(runtime.trace.debug.args).to.eql([['going down random path', BaseNode.NodeType.RANDOM]]);
          expect(runtime.storage.get(S.RANDOMS)[node.id]).to.eql([result]);
        });

        it('only one option left', async () => {
          const nextIds = ['one', 'two', 'three'];
          const node = { id: 'node-id', nextIds, random: 2 };

          const runtime = { trace: { debug: sinon.stub() }, storage: new Store({ [S.RANDOMS]: { [node.id]: ['one', 'three'] } }) };
          const result = await randomHandler.handle(node as any, runtime as any, null as any, null as any);
          // only one option possible left
          expect(result).to.eql('two');
          expect(runtime.trace.debug.args).to.eql([['going down random path', BaseNode.NodeType.RANDOM]]);
          expect(runtime.storage.get(S.RANDOMS)[node.id]).to.eql(['one', 'three', 'two']);
        });

        it('no option left', async () => {
          const nextIds = ['one', 'two', 'three'];
          const node = { id: 'node-id', nextIds, random: 2 };

          const runtime = { trace: { debug: sinon.stub() }, storage: new Store({ [S.RANDOMS]: { [node.id]: nextIds } }) };
          const result = await randomHandler.handle(node as any, runtime as any, null as any, null as any);
          // result is one of the ids in nextIds
          expect(nextIds.includes(result as string)).to.eql(true);
          expect(runtime.trace.debug.args).to.eql([['going down random path', BaseNode.NodeType.RANDOM]]);
          expect(runtime.storage.get(S.RANDOMS)[node.id]).to.eql([result]);
        });
      });
    });
  });
});
