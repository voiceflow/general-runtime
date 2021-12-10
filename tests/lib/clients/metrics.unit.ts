import axios from 'axios';
import { expect } from 'chai';
import getPort from 'get-port';
import _ from 'lodash';
import { setTimeout as sleep } from 'timers/promises';
import types from 'util/types';

import MetricsClient, { Metrics } from '@/lib/clients/metrics';

const baseConfig = async () => ({ PORT_METRICS: await getPort(), NODE_ENV: 'test' });

const assertHelper = async ({ config = {}, expected }: { config?: Record<any, any>; expected: RegExp | ReadonlyArray<RegExp> }) => {
  const combinedConfig = { ...(await baseConfig()), ...config };

  const metrics = MetricsClient(combinedConfig as any);

  const expressions = types.isRegExp(expected) ? [expected] : expected;

  return {
    metrics,
    async assert(): Promise<void> {
      await sleep(1);

      try {
        const { data } = await axios.get<string>(`http://localhost:${combinedConfig.PORT_METRICS}/metrics`);

        expressions.forEach((expression) => {
          expect(data).to.match(expression);
        });
      } finally {
        await metrics.stop();
      }
    },
  };
};

describe('metrics client unit tests', () => {
  it('new', async () => {
    const config = await baseConfig();

    const metrics = new Metrics(config as any);

    await metrics.stop();
  });

  it('generalRequest', async () => {
    const helper = await assertHelper({ expected: /^general_request_total 1 \d+$/m });

    helper.metrics.generalRequest();

    await helper.assert();
  });

  it('sdkRequest', async () => {
    const helper = await assertHelper({ expected: /^sdk_request_total 1 \d+$/m });

    helper.metrics.sdkRequest();

    await helper.assert();
  });

  it('httpRequestDuration', async () => {
    const helper = await assertHelper({
      expected: [
        /^http_request_duration_count{operation="operation",status_code="123"} 2 \d+$/m,
        /^http_request_duration_sum{operation="operation",status_code="123"} 300 \d+$/m,
        /^http_request_duration_bucket{operation="operation",status_code="123",le="\+Inf"} 2 \d+$/m,
      ],
    });

    helper.metrics.httpRequestDuration('operation', 123, { duration: 200 });
    helper.metrics.httpRequestDuration('operation', 123, { duration: 100 });

    await helper.assert();
  });
});
