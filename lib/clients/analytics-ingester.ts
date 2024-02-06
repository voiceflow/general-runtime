import { BaseTrace } from '@voiceflow/base-types';
import { EmptyObject } from '@voiceflow/common';
import { Api as IngestApi, Client as IngestClient } from '@voiceflow/event-ingestion-service/build/lib/client';
import { Event, IngestableInteraction, IngestableTrace } from '@voiceflow/event-ingestion-service/build/lib/types';

import log from '@/logger';
import { Config, Context } from '@/types';

import { RuntimeRequest } from '../services/runtime/types';
import { AbstractClient } from './utils';

type GeneralInteractionBody = IngestableInteraction<
  { locale?: string; end?: boolean },
  BaseTrace.AnyTrace | RuntimeRequest | EmptyObject
>;
type GeneralTraceBody = IngestableTrace<BaseTrace.AnyTrace | RuntimeRequest>;

export class IngesterClient extends AbstractClient {
  private ingestClient?: IngestApi<GeneralInteractionBody, GeneralTraceBody>;

  constructor(config: Config) {
    super(config);

    if (config.INGEST_V2_WEBHOOK_ENDPOINT) {
      this.ingestClient = IngestClient(config.INGEST_V2_WEBHOOK_ENDPOINT, undefined);
    }
  }

  private createTraceBody({
    fullTrace,
    metadata,
  }: {
    fullTrace: readonly BaseTrace.AnyTrace[];
    metadata: Context;
  }): GeneralTraceBody[] {
    return fullTrace.map((trace) => ({
      type: (trace ?? metadata.request).type,
      payload: trace ?? metadata.request,
    }));
  }

  private createInteractionBody({
    projectID,
    versionID,
    metadata,
    timestamp,
  }: {
    projectID: string;
    versionID: string;
    metadata: Context;
    timestamp: Date;
  }): GeneralInteractionBody {
    const sessionID = metadata.data.reqHeaders?.sessionid ?? metadata.userID ?? versionID;

    return {
      projectID,
      platform: metadata.data.reqHeaders?.platform ?? '',
      sessionID,
      versionID,
      startTime: timestamp.toISOString(),
      metadata: {
        end: metadata.end,
        locale: metadata.data.locale,
      },
      action: {
        type: metadata.request ? 'request' : 'launch',
        payload: metadata.request ?? {},
      },
      traces: this.createTraceBody({
        fullTrace: metadata.trace ?? [],
        metadata,
      }),
    };
  }

  async track({
    projectID,
    versionID,
    event,
    metadata,
    timestamp,
  }: {
    projectID: string;
    versionID: string;
    event: Event;
    metadata: Context;
    timestamp: Date;
  }): Promise<void> {
    log.trace(`[analytics] process trace %o`, { versionID });
    switch (event) {
      case Event.TURN: {
        const interactionBody = this.createInteractionBody({ projectID, versionID, metadata, timestamp });
        await this.ingestClient?.ingestInteraction(interactionBody);

        break;
      }
      case Event.INTERACT:
        throw new RangeError('INTERACT events are not supported');
      default:
        throw new RangeError(`Unknown event type: ${event}`);
    }
  }
}

const AnalyticsIngester = (config: Config) => new IngesterClient(config);

export default AnalyticsIngester;
