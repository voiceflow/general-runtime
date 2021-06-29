import { expect } from 'chai';
import sinon from 'sinon';

import AnalyticsClient from '@/lib/clients/analytics';

describe('Analytics client unit tests', () => {
  describe('Identify', () => {
    afterEach(() => {
      sinon.restore();
    });

    it('works', () => {
      const config = {};

      const rudderstack = { identify: sinon.stub() };

      const client = AnalyticsClient(config as any);

      (client as any).rudderstackClient = rudderstack;

      client.identify('user id');

      expect(rudderstack.identify.callCount).to.eql(1);
      expect(rudderstack.identify.getCall(0).args).to.deep.eq([{ userId: 'user id' }]);
    });
  });
});
