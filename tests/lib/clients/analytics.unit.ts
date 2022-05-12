import { expect } from 'chai';
import sinon from 'sinon';

import AnalyticsClient from '@/lib/clients/analytics';
import { Event } from '@/lib/clients/ingest-client';

describe('Analytics client unit tests', () => {
  describe('Track', () => {
    it('throws on unknown events', () => {
      const client = AnalyticsClient({} as any);

      expect(
        client.track({
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
        INGEST_WEBHOOK_ENDPOINT: 'http://localhost/ingest',
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

      const ingestClient = { doIngest: sinon.stub().resolves({ data: { success: true } }) };

      (client as any).ingestClient = ingestClient;
      const timestamp = new Date();

      const ingestResponse = await client.track({ versionID: 'id', event: Event.TURN, metadata: metadata as any, timestamp });
      expect(ingestResponse).to.equal(undefined);
    });
  });
});
