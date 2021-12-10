import { Counter, ValueRecorder } from '@opentelemetry/api-metrics';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { Meter, MeterProvider, MetricExporter } from '@opentelemetry/sdk-metrics-base';

import log from '@/logger';
import { Config } from '@/types';

export class Metrics {
  private meter: Meter;

  private exporter: MetricExporter;

  private counters: {
    general: {
      request: Counter;
    };
    sdk: {
      request: Counter;
    };
  };

  private recorders: {
    httpRequestDuration: ValueRecorder;
  };

  constructor(config: Config) {
    const port = config.PORT_METRICS ? Number(config.PORT_METRICS) : PrometheusExporter.DEFAULT_OPTIONS.port;
    const { endpoint } = PrometheusExporter.DEFAULT_OPTIONS;

    this.exporter = new PrometheusExporter({ port, endpoint }, () => {
      log.info(`[metrics] exporter ready ${log.vars({ port, path: endpoint })}`);
    });

    this.meter = new MeterProvider({ exporter: this.exporter, interval: config.NODE_ENV === 'test' ? 0 : 1000 }).getMeter('general-runtime');

    this.counters = {
      general: {
        request: this.meter.createCounter('general_request', { description: 'General requests' }),
      },
      sdk: {
        request: this.meter.createCounter('sdk_request', { description: 'SDK requests' }),
      },
    };

    this.recorders = {
      httpRequestDuration: this.meter.createValueRecorder('http_request_duration', { description: 'Http requests duration' }),
    };
  }

  generalRequest(): void {
    this.counters.general.request.add(1);
  }

  sdkRequest(): void {
    this.counters.sdk.request.add(1);
  }

  httpRequestDuration(operation: string, statusCode: number, opts: { duration: number }): void {
    this.recorders.httpRequestDuration
      .bind({
        operation,
        status_code: statusCode.toString(),
      })
      .record(opts.duration);
  }

  async stop(): Promise<void> {
    await this.meter.shutdown();
    await this.exporter.shutdown();
  }
}

const MetricsClient = (config: Config) => new Metrics(config);

export type MetricsType = Metrics;

export default MetricsClient;
