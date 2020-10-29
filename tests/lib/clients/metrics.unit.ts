import { expect } from 'chai';
import _ from 'lodash';
import sinon from 'sinon';

import Config from '@/config';
import MetricsClient, { Metrics } from '@/lib/clients/metrics';

describe('metrics client unit tests', () => {
  beforeEach(() => {
    sinon.restore();
  });

  it('new', () => {
    const NODE_ENV = 'test';
    const loggerStub = sinon.stub().returns({
      increment: () => {
        //
      },
    });

    const metrics = new Metrics({ NODE_ENV, DATADOG_API_KEY: 'key' } as any, loggerStub as any);

    expect(typeof _.get(metrics, 'client.increment')).to.eql('function');

    expect(loggerStub.calledWithNew()).to.eql(true);
    expect(loggerStub.args).to.eql([
      [
        {
          apiKey: 'key',
          prefix: `vf_server.${NODE_ENV}.`,
          flushIntervalSeconds: 5,
        },
      ],
    ]);
  });

  it('prototypeRequest', () => {
    const metrics = MetricsClient({} as any);
    const increment = sinon.stub();
    _.set(metrics, 'client', { increment });

    metrics.prototypeRequest();
    expect(increment.args).to.eql([['test.request']]);
  });
});
