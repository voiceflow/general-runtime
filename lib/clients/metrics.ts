import { BufferedMetricsLogger } from 'datadog-metrics';

import { Config } from '@/types';

export class Metrics {
  private client: BufferedMetricsLogger;

  constructor(config: Config, Logger: typeof BufferedMetricsLogger) {
    this.client = new Logger({
      apiKey: config.DATADOG_API_KEY,
      prefix: `vf_general_runtime.${config.NODE_ENV}.`,
      flushIntervalSeconds: 5,
    });
  }

  generalRequest() {
    this.client.increment('general.request');
  }

  sdkRequest() {
    this.client.increment('sdk.request');
  }
}

const MetricsClient = (config: Config) => new Metrics(config, BufferedMetricsLogger);

export type MetricsType = Metrics;

export default MetricsClient;
