import * as VFMetrics from '@voiceflow/metrics';

import MetricsClient from '@/lib/clients/metrics';

const metricsAsserter = new VFMetrics.Testing.MetricsAsserter(MetricsClient);

describe('metrics client unit tests', () => {
  it('generalRequest', async () => {
    const fixture = await metricsAsserter.assertMetric({ expected: /^general_request_total 1 \d+$/m });

    fixture.metrics.generalRequest();

    await fixture.assert();
  });

  it('sdkRequest', async () => {
    const fixture = await metricsAsserter.assertMetric({ expected: /^sdk_request_total 1 \d+$/m });

    fixture.metrics.sdkRequest();

    await fixture.assert();
  });
});
