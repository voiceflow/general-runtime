import { expect } from 'chai';
import _ from 'lodash';
import sinon from 'sinon';

import { RateLimiterClient } from '@/lib/clients/rateLimiter';

describe('rateLimiter client unit tests', () => {
  beforeEach(() => {
    sinon.restore();
  });

  it('constructor', async () => {
    const redis = 'redis-client';
    const config = {
      RATE_LIMITER_POINTS_PUBLIC: 1000,
      RATE_LIMITER_DURATION_PUBLIC: 60,
      RATE_LIMITER_POINTS_PRIVATE: 500,
      RATE_LIMITER_DURATION_PRIVATE: 60,
    };

    const limiter = RateLimiterClient(redis as any, config as any);

    expect(_.get(limiter.public, '_client')).to.eql(redis);
    expect(_.get(limiter.public, '_points')).to.eql(config.RATE_LIMITER_POINTS_PUBLIC);
    expect(_.get(limiter.public, '_duration')).to.eql(config.RATE_LIMITER_DURATION_PUBLIC);
    expect(_.get(limiter.public, '_keyPrefix')).to.eql('general-runtime-rate-limiter-public');

    expect(_.get(limiter.private, '_client')).to.eql(redis);
    expect(_.get(limiter.private, '_points')).to.eql(config.RATE_LIMITER_POINTS_PRIVATE);
    expect(_.get(limiter.private, '_duration')).to.eql(config.RATE_LIMITER_DURATION_PRIVATE);
    expect(_.get(limiter.private, '_keyPrefix')).to.eql('general-runtime-rate-limiter-private');
  });
});
