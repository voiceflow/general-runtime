import * as rudderstack from '@rudderstack/rudder-sdk-node';
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

      const identify = sinon.stub();

      console.log(rudderstack);

      // TODO: Throwing with TypeError: Cannot assign to read only property 'default' of object '#<Object>'
      // @ts-expect-error
      rudderstack.default = class RudderstackMock {
        identify = identify;
      };

      const client = AnalyticsClient(config as any);

      client.identify('user id');

      expect(identify.callCount).to.eql(1);
      expect(identify.getCall(0).args).to.deep.eq([{ userId: 'user id' }]);
    });
  });
});
