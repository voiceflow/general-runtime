import { BaseTrace } from '@voiceflow/base-types';

import * as Ingest from '@/ingest';
import log from '@/logger';
import { Config, Context } from '@/types';

import { RuntimeRequest } from '../services/runtime/types';
import { AbstractClient } from './utils';

type GeneralTurnBody = Ingest.TurnBody<{
  locale?: string;
  end?: boolean;
}>;

type GeneralInteractBody = Ingest.InteractBody<BaseTrace.AnyTrace | RuntimeRequest>;

export class AnalyticsSystem extends AbstractClient {
  private ingestClient?: Ingest.Api<GeneralInteractBody, GeneralTurnBody>;

  constructor(config: Config) {
    super(config);

    if (config.INGEST_WEBHOOK_ENDPOINT) {
      this.ingestClient = Ingest.Client(config.INGEST_WEBHOOK_ENDPOINT, undefined);
    }
  }

  private createInteractBody({
    eventID,
    turnID,
    timestamp,
    trace,
    request,
  }: {
    eventID: Ingest.Event;
    turnID: string;
    timestamp: Date;
    trace?: BaseTrace.AnyTrace;
    request?: RuntimeRequest;
  }): GeneralInteractBody {
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
        // eslint-disable-next-line no-nested-ternary
        type: (trace ?? request)?.type ?? 'launch',
        payload: trace ?? request ?? {},
        format,
        timestamp: timestamp.toISOString(),
      },
    } as GeneralInteractBody;
  }

  private createTurnBody({
    versionID,
    eventID,
    metadata,
    timestamp,
  }: {
    versionID: string;
    eventID: Ingest.Event;
    metadata: Context;
    timestamp: Date;
  }): GeneralTurnBody {
    const sessionId =
      metadata.data.reqHeaders?.sessionid ?? (metadata.state?.variables ? `${versionID}.${metadata.state.variables.user_id}` : versionID);

    return {
      eventId: eventID,
      request: {
        platform: metadata.data.reqHeaders?.platform,
        session_id: sessionId,
        version_id: versionID,
        state: metadata.state,
        timestamp: timestamp.toISOString(),
        metadata: {
          end: metadata.end,
          locale: metadata.data.locale,
        },
      },
    };
  }

  private async processTrace({
    fullTrace,
    turnID,
    versionID,
    timestamp,
  }: {
    fullTrace: readonly BaseTrace.AnyTrace[];
    turnID: string;
    versionID: string;
    timestamp: Date;
  }): Promise<void> {
    log.trace(`[analytics] process trace ${log.vars({ turnID, versionID })}`);
    // add milliseconds to put it behind response, and to maintain interact order
    const unixTime = timestamp.getTime() + 1;

    // eslint-disable-next-line no-restricted-syntax
    for (const [index, trace] of fullTrace.entries()) {
      const interactIngestBody = this.createInteractBody({ eventID: Ingest.Event.INTERACT, turnID, timestamp: new Date(unixTime + index), trace });

      if (this.ingestClient) {
        // eslint-disable-next-line no-await-in-loop
        await this.ingestClient.doIngest(interactIngestBody);
      }
    }
  }

  async track({
    versionID,
    event,
    metadata,
    timestamp,
  }: {
    versionID: string;
    event: Ingest.Event;
    metadata: Context;
    timestamp: Date;
  }): Promise<void> {
    log.trace(`[analytics] track ${log.vars({ versionID })}`);
    switch (event) {
      case Ingest.Event.TURN: {
        const turnIngestBody = this.createTurnBody({ versionID, eventID: event, metadata, timestamp });

        // User/initial interact
        const response = await this.ingestClient?.doIngest(turnIngestBody);

        if (response) {
          // Request
          const interactIngestBody = this.createInteractBody({
            eventID: Ingest.Event.INTERACT,
            turnID: response.data.turn_id,
            timestamp,
            trace: undefined,
            request: metadata.request,
          });
          await this.ingestClient?.doIngest(interactIngestBody);

          // Voiceflow response
          await this.processTrace({ fullTrace: metadata.trace ?? [], turnID: response.data.turn_id, versionID, timestamp });
        }
        break;
      }
      case Ingest.Event.INTERACT:
        throw new RangeError('INTERACT events are not supported');
      default:
        throw new RangeError(`Unknown event type: ${event}`);
    }
  }
}

const AnalyticsClient = (config: Config) => new AnalyticsSystem(config);

export default AnalyticsClient;
