import { BaseTrace, BaseUtils } from '@voiceflow/base-types';
import { expect } from 'chai';

import AIAssist, { MAX_CONTENT_LENGTH } from '@/lib/services/aiAssist';
import { Store } from '@/runtime';

describe('aiAssist unit tests', () => {
  let variables: Store;

  beforeEach(() => {
    variables = new Store({});
  });

  describe('injectOutput', () => {
    it('should append content to an existing assistant message', () => {
      const existingMessage = { role: BaseUtils.ai.Role.ASSISTANT, content: 'Hello' };
      variables.set(AIAssist.StorageKey, [existingMessage]);

      const trace = {
        type: BaseTrace.TraceType.TEXT,
        payload: { message: 'world' },
      } as BaseTrace.TextTrace;

      AIAssist.injectOutput(variables, trace);

      const expectedMessage = { role: BaseUtils.ai.Role.ASSISTANT, content: 'Hello\nworld' };
      expect(variables.get(AIAssist.StorageKey)).to.eql([expectedMessage]);
    });

    it('should append truncate assistant message if it exceeds the maximum length', () => {
      const existingMessage = { role: BaseUtils.ai.Role.ASSISTANT, content: 'Hello' };
      variables.set(AIAssist.StorageKey, [existingMessage]);

      const trace = {
        type: BaseTrace.TraceType.TEXT,
        payload: { message: '0'.repeat(50000) },
      } as BaseTrace.TextTrace;

      AIAssist.injectOutput(variables, trace);

      const content = variables.get<BaseUtils.ai.Message[]>(AIAssist.StorageKey)?.[0].content;

      expect(content).to.have.length(MAX_CONTENT_LENGTH);
      expect(content?.startsWith('Hello\n')).to.eql(true);
    });

    it('should convert to string representation and store it', () => {
      const trace = {
        type: BaseTrace.TraceType.TEXT,
        payload: { message: 'Sample message' },
      } as BaseTrace.TextTrace;

      AIAssist.injectOutput(variables, trace);

      expect(variables.get(AIAssist.StringStorageKey)).to.eql('assistant: Sample message');
    });

    it('should create a new assistant message if the last message is not from assistant', () => {
      const existingMessage = { role: BaseUtils.ai.Role.USER, content: 'User message' };

      variables.set(AIAssist.StorageKey, [existingMessage]);

      const trace = {
        type: BaseTrace.TraceType.TEXT,
        payload: { message: 'New assistant message' },
      } as BaseTrace.TextTrace;

      AIAssist.injectOutput(variables, trace);

      expect(variables.get(AIAssist.StorageKey)).to.eql([
        existingMessage,
        { role: BaseUtils.ai.Role.ASSISTANT, content: 'New assistant message' },
      ]);
    });
  });
});
