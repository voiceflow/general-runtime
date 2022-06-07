import { Event } from '@voiceflow/event-ingestion-service/build/lib/types';
import { expect } from 'chai';
import sinon from 'sinon';

import AnalyticsClient from '@/lib/clients/analytics';

describe('Analytics client unit tests', () => {
  describe('Track', () => {
    it('throws on unknown events', () => {
      const client = AnalyticsClient({} as any);

      expect(
        client.track({
          projectID: 'projectID',
          versionID: 'id',
          event: 'unknown event' as any,
          metadata: {} as any,
          timestamp: new Date(),
        })
      ).to.eventually.rejectedWith(RangeError);
    });

    it('throws on interact events', () => {
      const client = AnalyticsClient({} as any);

      expect(
        client.track({
          projectID: 'projectID',
          versionID: 'id',
          event: Event.INTERACT,
          metadata: {} as any,
          timestamp: new Date(),
        })
      ).to.eventually.rejectedWith(RangeError);
    });

    it('works with turn events', async () => {
      const config = {
        ANALYTICS_WRITE_KEY: 'write key',
        ANALYTICS_ENDPOINT: 'http://localhost/analytics',
        INGEST_V2_WEBHOOK_ENDPOINT: 'http://localhost/ingest',
      };

      const metadata = {
        data: {
          reqHeaders: {},
          locale: 'locale',
        },
        state: { variables: { user_id: 'user id' } },
        end: 'end',
        trace: [{ payload: 'trace payload' }],
      };

      const client = AnalyticsClient(config as any);

      const ingestClient = { ingestInteraction: sinon.stub().resolves({ data: { turnID: 'turnID' } }) };

      (client as any).ingestClient = ingestClient;
      const timestamp = new Date();

      const ingestResponse = await client.track({
        projectID: 'projectID',
        versionID: 'id',
        event: Event.TURN,
        metadata: metadata as any,
        timestamp,
      });
      expect(ingestResponse).to.equal(undefined);
    });
  });
});
