import { expect } from 'chai';
import sinon from 'sinon';

import { Event } from '@/lib/clients/ingest-client';
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
    const projectID = '1234';
    const findOne = sinon.stub().resolves({ projectID });
    const services = {
      analyticsClient: {
        track: sinon.stub().resolves('done'),
      },
      mongo: { db: { collection: sinon.stub().returns({ findOne }) } },
    };
    const analytics = new AnalyticsManager(services as any, {} as any);
    const context = { versionID: 1, data: '_context123' };
    expect(analytics.handle(context as any)).to.eql(context);

    expect((await Promise.resolve(services.analyticsClient.track)).args).to.eql([
      [{ projectID, versionID: context.versionID, event: Event.TURN, metadata: context, timestamp: clock.Date() }],
    ]);
  });
});
