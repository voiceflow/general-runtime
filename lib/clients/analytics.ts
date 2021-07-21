import Rudderstack, { IdentifyRequest, TrackRequest } from '@rudderstack/rudder-sdk-node';
import { GeneralTrace } from '@voiceflow/general-types';

import log from '@/logger';
import { Config, Context } from '@/types';

import { RuntimeRequest } from '../services/runtime/types';
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

  private callAnalyticsSystemTrack(id: string, eventID: Event, metadata: InteractBody): void {
    const interactAnalyticsBody: TrackRequest = {
      userId: id,
      event: eventID,
      properties: {
        metadata,
      },
    };

    this.rudderstackClient!.track(interactAnalyticsBody);
  }

  private createInteractBody({
    eventID,
    turnID,
    timestamp,
    trace,
    request,
  }: {
    eventID: Event;
    turnID: string;
    timestamp: Date;
    trace?: GeneralTrace;
    request?: RuntimeRequest;
  }): InteractBody {
    let format: string;

    if (trace) {
      format = 'trace';
    } else if (request) {
      format = 'request';
    } else {
      format = 'launch';
    }

    return {
      eventId: eventID,
      request: {
        turn_id: turnID,
        type: trace ? trace.type : request ?? 'launch',
        payload: trace ?? request ?? {},
        format,
        timestamp: timestamp.toISOString(),
      },
    } as InteractBody;
  }

  private createTurnBody({
    versionID,
    eventID,
    metadata,
    timestamp,
  }: {
    versionID: string;
    eventID: Event;
    metadata: Context;
    timestamp: Date;
  }): TurnBody {
    const sessionId =
      metadata.data.reqHeaders?.sessionid ?? (metadata.state?.variables ? `${versionID}.${metadata.state.variables.user_id}` : versionID);

    return {
      eventId: eventID,
      request: {
        session_id: sessionId,
        version_id: versionID,
        state: metadata.state,
        timestamp: timestamp.toISOString(),
        metadata: {
          end: metadata.end,
          locale: metadata.data.locale,
        },
      },
    } as TurnBody;
  }

  private async processTrace({
    fullTrace,
    turnID,
    versionID,
    timestamp,
  }: {
    fullTrace: GeneralTrace[];
    turnID: string;
    versionID: string;
    timestamp: Date;
  }): Promise<void> {
    // eslint-disable-next-line no-restricted-syntax
    for (const trace of Object.values(fullTrace)) {
      const interactIngestBody = this.createInteractBody({ eventID: Event.INTERACT, turnID, timestamp, trace });

      if (this.aggregateAnalytics && this.rudderstackClient) {
        this.callAnalyticsSystemTrack(versionID, interactIngestBody.eventId, interactIngestBody);
      }
      if (this.ingestClient) {
        // eslint-disable-next-line no-await-in-loop
        await this.ingestClient.doIngest(interactIngestBody);
      }
    }
  }

  async track({ versionID, event, metadata, timestamp }: { versionID: string; event: Event; metadata: Context; timestamp: Date }): Promise<void> {
    log.trace('analytics: Track');
    switch (event) {
      case Event.TURN: {
        const turnIngestBody = this.createTurnBody({ versionID, eventID: event, metadata, timestamp });

        // User/initial interact
        if (this.aggregateAnalytics && this.rudderstackClient) {
          this.callAnalyticsSystemTrack(versionID, event, turnIngestBody);
        }
        const response = await this.ingestClient!.doIngest(turnIngestBody);

        // Request
        const interactIngestBody = this.createInteractBody({
          eventID: Event.INTERACT,
          turnID: response.data.turn_id,
          timestamp,
          trace: undefined,
          request: metadata.request,
        });
        await this.ingestClient?.doIngest(interactIngestBody);

        // Voiceflow response
        return this.processTrace({ fullTrace: metadata.trace ?? [], turnID: response.data.turn_id, versionID, timestamp });
      }
      case Event.INTERACT:
        throw new RangeError('INTERACT events are not supported');
      default:
        throw new RangeError(`Unknown event type: ${event}`);
    }
  }
}

const AnalyticsClient = (config: Config) => new AnalyticsSystem(config);

export default AnalyticsClient;
