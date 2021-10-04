import { expect } from 'chai';
import sinon from 'sinon';

import { Event } from '@/lib/clients/ingest-client';
import AnalyticsManager from '@/lib/services/analytics';

describe('analytics manager unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('works correctly', () => {
    const services = {
      analyticsClient: {
        track: sinon.stub().resolves(),
      },
    };
    const analytics = new AnalyticsManager(services as any, {} as any);
    const context = { versionID: 1, data: '_context123' };
    expect(analytics.handle(context as any)).to.eql(context);

    // TODO: This doesn't work - https://app.circleci.com/pipelines/github/voiceflow/general-runtime/1333/workflows/983fe1f5-3df4-4e88-9266-840a68f6c14b/jobs/2720
    const clock = sinon.useFakeTimers(new Date());

    expect(services.analyticsClient.track.args).to.eql([
      [{ versionID: context.versionID, event: Event.TURN, metadata: context, timestamp: clock.Date() }],
    ]);

    clock.restore();
  });
});
