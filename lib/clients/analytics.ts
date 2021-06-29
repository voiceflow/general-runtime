import Analytics, { IdentifyRequest, TrackRequest } from '@rudderstack/rudder-sdk-node';
import { GeneralTrace } from '@voiceflow/general-types';
import { AxiosResponse } from 'axios';

import log from '@/logger';
import { Config, Context } from '@/types';

import IngestApiClient, { EventsType, IngestApi, InteractBody } from './ingest-client';

export class AnalyticsSystem {
  private analyticsClient?: Analytics;

  private ingestClient?: IngestApi;

  private aggregateAnalytics = false;

  constructor(config?: Config) {
    if (!config) return;

    if (config.ANALYTICS_WRITE_KEY && config.ANALYTICS_ENDPOINT) {
      this.analyticsClient = new Analytics(config.ANALYTICS_WRITE_KEY, `${config.ANALYTICS_ENDPOINT}/v1/batch`);
    }

    if (config.INGEST_WEBHOOK_ENDPOINT) {
      this.ingestClient = IngestApiClient(config.INGEST_WEBHOOK_ENDPOINT, undefined);
    }
    this.aggregateAnalytics = !config.IS_PRIVATE_CLOUD;
  }

  identify(id: string) {
    const payload: IdentifyRequest = {
      userId: id,
    };

    if (this.aggregateAnalytics && this.analyticsClient) {
      log.trace('analytics: Identify');
      this.analyticsClient.identify(payload);
    }
  }

  private callAnalyticsSystemTrack(id: string, eventId: string, metadata: InteractBody) {
    const interactAnalyticsBody: TrackRequest = {
      userId: id,
      event: eventId,
      properties: {
        metadata,
      },
    };
    this.analyticsClient!.track(interactAnalyticsBody);
  }

  private createInteractBody(id: string, eventId: string, metadata: Context): InteractBody {
    const sessionId = metadata.data.reqHeaders?.sessionId ?? (metadata.state?.variables ? `${id}.${metadata.state.variables.user_id}` : id);

    return {
      eventId,
      request: {
        requestType: metadata.request ? 'request' : 'launch',
        sessionId,
        versionId: id,
        payload: metadata.request ?? { type: 'launch' },
        metadata: {
          state: metadata.state,
          end: metadata.end,
          locale: metadata.data.locale,
        },
      },
    } as InteractBody;
  }

  private async processTrace(fullTrace: GeneralTrace[], interactIngestBody: InteractBody): Promise<boolean> {
    let response: AxiosResponse | undefined;
    // eslint-disable-next-line no-restricted-syntax
    for (const trace of Object.values(fullTrace)) {
      interactIngestBody.request.requestType = 'response';
      interactIngestBody.request.payload = trace;

      if (this.aggregateAnalytics && this.analyticsClient) {
        this.callAnalyticsSystemTrack(interactIngestBody.request.versionId!, interactIngestBody.eventId, interactIngestBody);
      }
      if (this.ingestClient) {
        // eslint-disable-next-line no-await-in-loop
        response = await this.ingestClient.doIngest(interactIngestBody);

        if (response && response.status !== 200) {
          return false;
        }
      }
    }

    return true;
  }

  async track(id: string, eventId: string, metadata: Context): Promise<boolean> {
    log.trace('track');
    // eslint-disable-next-line sonarjs/no-small-switch
    switch (eventId as EventsType) {
      case EventsType.INTERACT: {
        const interactIngestBody = this.createInteractBody(id, eventId, metadata);

        // User/initial interact
        if (this.aggregateAnalytics && this.analyticsClient) {
          this.callAnalyticsSystemTrack(id, eventId, interactIngestBody);
        }
        if (this.ingestClient) {
          const response = await this.ingestClient.doIngest(interactIngestBody);
          if (response.status !== 200) {
            return false;
          }
        }

        // Voiceflow interact
        return this.processTrace(metadata.trace!, interactIngestBody);
      }
      default:
        return true;
    }
  }
}

const AnalyticsClient = (config: Config) => new AnalyticsSystem(config);

export type AnalyticsType = AnalyticsSystem;

export default AnalyticsClient;
