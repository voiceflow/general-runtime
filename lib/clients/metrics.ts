import { Counter } from '@opentelemetry/api-metrics';
import * as VFMetrics from '@voiceflow/metrics';

import log from '@/logger';
import { Config } from '@/types';

export class Metrics extends VFMetrics.Client.Metrics {
  protected counters: {
    general: {
      request: Counter;
    };
    sdk: {
      request: Counter;
    };
    deprecatedAPIKeys: {
      request: Counter;
    };
  };

  constructor(config: Config) {
    super({ ...config, SERVICE_NAME: 'general-runtime' });

    super.once('ready', ({ port, path }: VFMetrics.Client.Events['ready']) => {
      log.info(`[metrics] exporter ready ${log.vars({ port, path })}`);
    });

    this.counters = {
      general: {
        request: this.meter.createCounter('general_request', { description: 'General requests' }),
      },
      sdk: {
        request: this.meter.createCounter('sdk_request', { description: 'SDK requests' }),
      },
      deprecatedAPIKeys: {
        request: this.meter.createCounter('deprecated_api_keys', {
          description: 'Requests made with deprecated Workspace API Keys',
        }),
      },
    };
  }

  generalRequest(): void {
    this.counters.general.request.add(1);
  }

  sdkRequest(): void {
    this.counters.sdk.request.add(1);
  }

  deprecatedAPIKey(apiKey: string): void {
    this.counters.deprecatedAPIKeys.request.add(1, { apiKey });
  }
}

const MetricsClient = (config: Config) => new Metrics(config);

export type MetricsType = Metrics;

export default MetricsClient;
