import { BaseNode } from '@voiceflow/base-types';
import { expect } from 'chai';
import _ from 'lodash';
import sinon from 'sinon';

import TTSManager, { utils as defaultUtils } from '@/lib/services/tts';

describe('tts manager unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('handle', () => {
    it('passes through if no speak', async () => {
      const context = { random: 'random', trace: [{ type: 'different' }] };
      const tts = new TTSManager({ utils: { ...defaultUtils } } as any, { GENERAL_SERVICE_ENDPOINT: 'vf' } as any);

      expect(await tts.handle(context as any)).to.eql(context);
    });

    it('passes through if has speak', async () => {
      const context = {
        data: { locale: 'locale-value' },
        random: 'random',
        trace: [{ type: BaseNode.Utils.TraceType.SPEAK, payload: { message: 'trace-message' } }],
      };
      const postStub = sinon
        .stub()
        .returns(Promise.resolve({ data: [{ message: 'payload-value1' }, { message: 'payload-value2' }] }));
      const tts = new TTSManager(
        { axios: { post: postStub }, utils: { ...defaultUtils } } as any,
        { GENERAL_SERVICE_ENDPOINT: 'vf' } as any
      );
      expect(await tts.handle(context as any)).to.eql({
        ...context,
        trace: [
          { type: BaseNode.Utils.TraceType.SPEAK, payload: { message: 'payload-value1' } },
          { type: BaseNode.Utils.TraceType.SPEAK, payload: { message: 'payload-value2' } },
        ],
      });
    });

    it('passes if trace does not exist', async () => {
      const context = { data: { locale: 'locale-value' }, random: 'random' };
      const tts = new TTSManager({ utils: { ...defaultUtils } } as any, { GENERAL_SERVICE_ENDPOINT: 'vf' } as any);

      expect(await tts.handle(context as any)).to.eql({ ...context, trace: [] });
    });

    it('passes if no general-service endpoint', async () => {
      const context = {
        data: { locale: 'locale-value' },
        random: 'random',
        trace: [{ type: BaseNode.Utils.TraceType.SPEAK, payload: { message: 'trace-message' } }],
      };
      const tts = new TTSManager({ utils: { ...defaultUtils } } as any, {} as any);

      expect(await tts.handle(context as any)).to.eql({ ...context, trace: context.trace });
    });
  });
});
