import Rudderstack, { IdentifyRequest, TrackRequest } from '@rudderstack/rudder-sdk-node';
import { GeneralTrace } from '@voiceflow/general-types';

import { RuntimeRequest } from '@/build/lib/services/runtime/types';
import log from '@/logger';
import { Config, Context } from '@/types';

import IngestApiClient, { Event, IngestApi, InteractBody, TurnBody } from './ingest-client';
import { AbstractClient } from './utils';

export class AnalyticsSystem extends AbstractClient {
  private rudderstackClient?: Rudderstack;

  private ingestClient?: IngestApi;

  private aggregateAnalytics = false;

  constructor(config: Config) {
    super(config);

    if (config.ANALYTICS_WRITE_KEY && config.ANALYTICS_ENDPOINT) {
      this.rudderstackClient = new Rudderstack(config.ANALYTICS_WRITE_KEY, `${config.ANALYTICS_ENDPOINT}/v1/batch`);
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

    if (this.aggregateAnalytics && this.rudderstackClient) {
      log.trace('analytics: Identify');
      this.rudderstackClient.identify(payload);
    }
  }

  private callAnalyticsSystemTrack(id: string, eventId: Event, metadata: InteractBody) {
    const interactAnalyticsBody: TrackRequest = {
      userId: id,
      event: eventId,
      properties: {
        metadata,
      },
    };
    this.rudderstackClient!.track(interactAnalyticsBody);
  }

  private createInteractBody(eventId: Event, turnId: string, timestamp: string, trace?: GeneralTrace, request?: RuntimeRequest): InteractBody {
    return {
      eventId,
      request: {
        turn_id: turnId,
        // eslint-disable-next-line no-nested-ternary
        type: trace ? trace.type : request ? request?.type : 'launch',
        payload: trace || request || {},
        // eslint-disable-next-line no-nested-ternary
        format: trace ? 'trace' : request ? 'request' : 'launch',
        timestamp,
      },
    } as InteractBody;
  }

  private createTurnBody(id: string, eventId: Event, metadata: Context, timestamp: string): TurnBody {
    const sessionId = metadata.data.reqHeaders?.sessionid ?? (metadata.state?.variables ? `${id}.${metadata.state.variables.user_id}` : id);

    return {
      eventId,
      request: {
        session_id: sessionId,
        version_id: id,
        state: metadata.state,
        timestamp,
        metadata: {
          end: metadata.end,
          locale: metadata.data.locale,
        },
      },
    } as TurnBody;
  }

  private async processTrace(fullTrace: GeneralTrace[], turnId: string, versionId: string, timestamp: string): Promise<void> {
    // eslint-disable-next-line no-restricted-syntax
    for (const trace of Object.values(fullTrace)) {
      const interactIngestBody = this.createInteractBody(Event.INTERACT, turnId, timestamp, trace, undefined);

      if (this.aggregateAnalytics && this.rudderstackClient) {
        this.callAnalyticsSystemTrack(versionId!, interactIngestBody.eventId, interactIngestBody);
      }
      if (this.ingestClient) {
        // eslint-disable-next-line no-await-in-loop
        await this.ingestClient.doIngest(interactIngestBody);
      }
    }
  }

  async track(id: string, event: Event, metadata: Context, timestamp: string): Promise<void> {
    log.trace('analytics: Track');
    // eslint-disable-next-line sonarjs/no-small-switch
    switch (event) {
      case Event.TURN: {
        const turnIngestBody = this.createTurnBody(id, event, metadata, timestamp);

        // User/initial interact
        if (this.aggregateAnalytics && this.rudderstackClient) {
          this.callAnalyticsSystemTrack(id, event, turnIngestBody);
        }
        const response = await this.ingestClient?.doIngest(turnIngestBody);

        // Request
        const interactIngestBody = this.createInteractBody(Event.INTERACT, response?.data.turn_id!, timestamp, undefined, metadata.request);
        await this.ingestClient?.doIngest(interactIngestBody);

        // Voiceflow response
        return this.processTrace(metadata.trace!, response?.data.turn_id!, id, timestamp);
      }
      default:
        throw new RangeError(`Unknown event type: ${event}`);
    }
  }
}

const AnalyticsClient = (config: Config) => new AnalyticsSystem(config);

export default AnalyticsClient;
