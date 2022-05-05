import { Event } from '@/lib/clients/ingest-client';
import log from '@/logger';
import { Context, ContextHandler } from '@/types';

import { AbstractManager } from './utils';

class Analytics extends AbstractManager implements ContextHandler {
  handle = (context: Context) => {
    const { versionID } = context;

    this.services.analyticsClient?.track({ versionID, event: Event.TURN, metadata: context, timestamp: new Date() }).catch((error) => {
      log.error(`[analytics] failed to track ${log.vars({ versionID, error })}`);
    });

    return context;
  };
}

export default Analytics;
