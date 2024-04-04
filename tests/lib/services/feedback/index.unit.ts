import { expect } from 'chai';
import sinon from 'sinon';

import FeedbackManager from '@/lib/services/feedback';

const VERSION_ID = 'version_id';
const PROJECT_ID = 'project_id';
const USER_ID = 'user_id';

describe('feedback manager unit tests', () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  describe('track', () => {
    it('works correctly', async () => {
      const services = {
        axios: { post: sinon.stub().resolves({}) },
      };

      const config = {
        ANALYTICS_API_SERVICE_URI: 'analytics-api.voiceflow.com',
        ANALYTICS_API_SERVICE_PORT_APP: '443',
      };

      const feedbackManager = new FeedbackManager(services as any, config as any);

      const context = {
        text: 'random text',
        projectID: PROJECT_ID,
        userID: USER_ID,
        versionID: VERSION_ID,
        name: 'Thums up',
      } as any;

      await feedbackManager.track(context);

      expect(services.axios.post.args[0][0]).to.eql(`/v1alpha1/t/event`);
      expect(services.axios.post.args[0][1]).to.eql({
        type: 'track',
        name: 'Thums up',
        properties: {
          text: 'random text',
          projectID: PROJECT_ID,
          versionID: VERSION_ID,
        },
        identity: {
          userID: null,
          anonymousID: USER_ID,
        },
      });

      expect(services.axios.post.args[0][2]).to.eql({
        baseURL: `http://analytics-api.voiceflow.com:443/`,
      });
    });
  });
});
