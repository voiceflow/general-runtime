import { expect } from 'chai';

import {
  getAnswerEndpoint,
  KNOWLEDGE_BASE_LAMBDA_ENDPOINT,
  RETRIEVE_ENDPOINT,
} from '@/lib/services/runtime/handlers/utils/knowledgeBase';
import { CloudEnv } from '@/lib/services/runtime/handlers/utils/knowledgeBase/types';

describe('knowledgebase retrieval unit tests', () => {
  describe('test getAnswerEndpoint', async () => {
    it('calls new KB for public', async () => {
      const endpoint = getAnswerEndpoint(CloudEnv.Public, 'anything');

      expect(endpoint).to.eql(RETRIEVE_ENDPOINT);
    });

    it('calls new KB for usbank', async () => {
      // all workspaces are enabled
      const endpoint = getAnswerEndpoint(CloudEnv.USBank, 'anything');

      expect(endpoint).to.eql(RETRIEVE_ENDPOINT);
    });

    it('calls old KB when appropriate (wrong cloud env)', async () => {
      const flaggedWorkspaceID = '80627';
      const nonFlaggedEnv = 'other';
      const expectedEndpoint = `${KNOWLEDGE_BASE_LAMBDA_ENDPOINT}/answer`;
      const endpoint = getAnswerEndpoint(nonFlaggedEnv, flaggedWorkspaceID);

      expect(endpoint).to.eql(expectedEndpoint);
    });
  });
});
