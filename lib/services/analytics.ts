import { Event } from '@voiceflow/event-ingestion-service/build/lib/types';

import log from '@/logger';
import { Context, ContextHandler } from '@/types';

import { AbstractManager } from './utils';

class Analytics extends AbstractManager implements ContextHandler {
  handle = (context: Context) => {
    const { versionID, projectID } = context;

    this.services.analyticsClient
      ?.track({
        projectID,
        versionID,
        event: Event.TURN,
        metadata: context,
        timestamp: new Date(),
      })
      .catch((error) => {
        log.error(`[analytics] failed to track ${log.vars({ versionID, error })}`);
      });

    return context;
  };
}

export default Analytics;
