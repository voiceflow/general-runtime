import { BaseTrace } from '@voiceflow/base-types';
import { EmptyObject } from '@voiceflow/common';

import * as Ingest from '@/ingest';
import log from '@/logger';
import { Config, Context } from '@/types';

import { RuntimeRequest } from '../services/runtime/types';
import { AbstractClient } from './utils';

// eslint-disable-next-line max-len
type GeneralInteractionBody = Ingest.InteractionBody<{ locale?: string; end?: boolean }, BaseTrace.AnyTrace | RuntimeRequest | EmptyObject>;
type GeneralTraceBody = Ingest.TraceBody<BaseTrace.AnyTrace | RuntimeRequest>;

export class AnalyticsSystem extends AbstractClient {
  private ingestClient?: Ingest.Api<GeneralInteractionBody, GeneralTraceBody>;

  constructor(config: Config) {
    super(config);

    if (config.INGEST_WEBHOOK_ENDPOINT) {
      this.ingestClient = Ingest.Client(config.INGEST_WEBHOOK_ENDPOINT, undefined);
    }
  }

  private createTraceBody({
    fullTrace,
    timestamp,
    metadata,
  }: {
    fullTrace: readonly BaseTrace.AnyTrace[];
    timestamp: Date;
    metadata: Context;
  }): GeneralTraceBody[] {
    // add milliseconds to maintain order
    const unixTime = timestamp.getTime() + 1;

    return fullTrace.map((trace, idx) => ({
      startTime: new Date(unixTime + idx).toISOString(),
      type: (trace ?? metadata.request).type,
      payload: trace ?? metadata.request,
      format: trace ? 'trace' : 'request',
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
    const sessionID =
      metadata.data.reqHeaders?.sessionid ?? (metadata.state?.variables ? `${versionID}.${metadata.state.variables.user_id}` : versionID);

    return {
      projectID,
      platform: metadata.data.reqHeaders?.platform,
      sessionID,
      versionID,
      startTime: timestamp.toISOString(),
      metadata: {
        end: metadata.end,
        locale: metadata.data.locale,
      },
      traces: [
        // launch trace
        {
          type: 'launch',
          payload: {},
          format: metadata.request ? 'request' : 'launch',
          startTime: timestamp.toISOString(),
        },
        // remaining traces
        ...this.createTraceBody({
          fullTrace: metadata.trace ?? [],
          timestamp,
          metadata,
        }),
      ],
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
    event: Ingest.Event;
    metadata: Context;
    timestamp: Date;
  }): Promise<void> {
    log.trace(`[analytics] process trace ${log.vars({ versionID })}`);
    switch (event) {
      case Ingest.Event.TURN: {
        const interactionBody = this.createInteractionBody({ projectID, versionID, metadata, timestamp });
        await this.ingestClient?.ingestInteraction(interactionBody);

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
