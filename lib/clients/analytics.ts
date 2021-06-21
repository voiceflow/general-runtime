import Analytics from '@rudderstack/rudder-sdk-node';
import { GeneralTrace, TraceType } from '@voiceflow/general-types';
import { AxiosResponse } from 'axios';

import { Config } from '@/types';

import IngestApi, { EventsType, InteractBody } from './ingest-client';

export class AnalyticsSystem {
  private analyticsClient: any;

  private aggregateAnalytics = false;

  private ingestClient?: IngestApi;

  constructor(config?: Config) {
    if (config) {
      if (config.ANALITICS_WRITE_KEY && config.ANALITICS_ENDPOINT) {
        this.analyticsClient = new Analytics(config.ANALITICS_WRITE_KEY!, `${config.ANALITICS_ENDPOINT!}/v1/batch`);
      }

      if (config.INGEST_WEBHOOK_ENDPOINT) {
        this.ingestClient = new IngestApi(config.INGEST_WEBHOOK_ENDPOINT, undefined);
      }
      this.aggregateAnalytics = true;
    }
  }

  identify(id: string) {
    const payload = {
      userId: id,
    };
    if (this.aggregateAnalytics && this.analyticsClient) {
      this.analyticsClient.identify(payload);
    }
  }

  private callAnalyticsSystemTrack(id: string, eventId: string, metadata: any) {
    const interactAnalyticsBody = {
      userId: id,
      event: eventId,
      properties: {
        state: metadata.state,
        request: metadata.request,
        trace: metadata.trace,
      },
    };
    this.analyticsClient.track(interactAnalyticsBody);
  }

  private createInteractBody(id: string, eventId: string, metadata: any): InteractBody {
    return {
      eventId,
      request: {
        userId: metadata.state.variables.user_id,
        sessionId: 'sessionId',
        versionId: id,
        payload: metadata.request != null ? metadata.request.payload.query : null,
        metadata: {
          state: metadata.state,
          request: metadata.request,
          trace: metadata.trace,
        },
      },
    } as InteractBody;
  }

  private async processTrace(fullTrace: GeneralTrace, interactIngestBody: InteractBody): Promise<boolean> {
    let response: AxiosResponse | undefined;
    // eslint-disable-next-line no-restricted-syntax
    for (const trace of Object.values(fullTrace)) {
      interactIngestBody.request.userId = 'voiceflow';
      if ((trace.type === TraceType.SPEAK || trace.type === TraceType.STREAM) && trace.payload.src) {
        interactIngestBody.request.payload = trace.payload.src;
      } else if (trace.type === TraceType.SPEAK && !trace.payload.src) {
        interactIngestBody.request.payload = trace.payload.message;
      } else if (trace.type === TraceType.VISUAL) {
        interactIngestBody.request.payload = trace.payload.image;
      } else {
        // Other case
        return false;
      }
      // eslint-disable-next-line no-await-in-loop
      response = await this.ingestClient!.doIngest(interactIngestBody);

      if (response && response.status !== 200) {
        return false;
      }
    }

    return true;
  }

  async track(id: string, eventId: string, metadata: any): Promise<boolean> {
    // eslint-disable-next-line sonarjs/no-small-switch
    switch (eventId as EventsType) {
      case EventsType.INTERACT: {
        if (this.aggregateAnalytics && this.analyticsClient) {
          this.callAnalyticsSystemTrack(id, eventId, metadata);
        }
        if (this.ingestClient) {
          const interactIngestBody = this.createInteractBody(id, eventId, metadata);
          // User interact
          const response = await this.ingestClient.doIngest(interactIngestBody);
          if (response.status !== 200) {
            return false;
          }

          // Voiceflow interact
          // eslint-disable-next-line no-return-await
          return await this.processTrace(metadata.trace as GeneralTrace, interactIngestBody);
        }
        break;
      }
      default:
        return true;
    }

    return true;
  }
}

const AnalyticsClient = (config: Config) => new AnalyticsSystem(config);

export type AnalyticsType = AnalyticsSystem;

export default AnalyticsClient;
