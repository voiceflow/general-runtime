import { expect } from 'chai';

import {
  getAnswerEndpoint,
  KNOWLEDGE_BASE_LAMBDA_ENDPOINT,
  RETRIEVE_ENDPOINT,
} from '@/lib/services/runtime/handlers/utils/knowledgeBase';

describe('knowledgebase retrieval unit tests', () => {
  describe('test getAnswerEndpoint', async () => {
    it('calls new KB when appropriate', async () => {
      // id for the Python KB Testing workspace created to test this feature
      const flaggedWorkspaceID = '80627';
      const endpoint = getAnswerEndpoint('public', flaggedWorkspaceID);

      expect(endpoint).to.eql(RETRIEVE_ENDPOINT);
    });

    it('calls new KB for usbank', async () => {
      // all workspaces are enabled
      const endpoint = getAnswerEndpoint('usbank', 'anything');

      expect(endpoint).to.eql(RETRIEVE_ENDPOINT);
    });

    it('calls old KB when appropriate (wrong workspace)', async () => {
      const nonFlaggedWorkspaceID = '123';
      const expectedEndpoint = `${KNOWLEDGE_BASE_LAMBDA_ENDPOINT}/answer`;
      const endpoint = getAnswerEndpoint('public', nonFlaggedWorkspaceID);

      expect(endpoint).to.eql(expectedEndpoint);
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
