import { Event } from '@voiceflow/event-ingestion-service/build/lib/types';
import { expect } from 'chai';
import sinon from 'sinon';

import AnalyticsManager from '@/lib/services/analytics';

describe('analytics manager unit tests', () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  it('works correctly', async () => {
    const services = {
      analyticsIngester: {
        track: sinon.stub().resolves(),
      },
    };
    const analytics = new AnalyticsManager(services as any, {} as any);
    const context = { versionID: 1, projectID: '1234', data: '_context123' };
    expect(analytics.handle(context as any)).to.eql(context);

    expect(services.analyticsIngester.track.args).to.eql([
      [
        {
          projectID: context.projectID,
          versionID: context.versionID,
          event: Event.TURN,
          metadata: context,
          timestamp: clock.Date(),
        },
      ],
    ]);
  });
});
