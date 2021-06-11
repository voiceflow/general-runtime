import Analytics from '@rudderstack/rudder-sdk-node';

import { Config } from '@/types';

export class AnalyticsSystem {
  private client: any;

  private aggregateAnalytics = false;

  constructor(config?: Config) {
    if (config) {
      if (config.ANALITICS_WRITE_KEY && config.ANALITICS_ENDPOINT) {
        this.client = new Analytics(config.ANALITICS_WRITE_KEY!, `${config.ANALITICS_ENDPOINT!}/v1/batch`);
      }
      this.aggregateAnalytics = !config.IS_PRIVATE_CLOUD;
    }
  }

  identify(userId: string) {
    const payload = {
      userId,
    };
    if (this.aggregateAnalytics && this.client) {
      this.client.identify(payload);
    }
    // TODO: add the webhook call
  }

  track(userId: string, eventId: string, metadata: any) {
    const payload = {
      userId,
      event: eventId,
      properties: metadata,
    };
    if (this.aggregateAnalytics && this.client) {
      this.client.track(payload);
    }
    // TODO: add the webhook call
  }
}

const AnalyticsClient = (config: Config) => new AnalyticsSystem(config);

export type AnalyticsType = AnalyticsSystem;

export default AnalyticsClient;
