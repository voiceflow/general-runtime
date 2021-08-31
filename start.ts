import 'core-js';
import 'regenerator-runtime/runtime';

import { ServiceManager } from './backend';
import config from './config';
import log from './logger';
import Server from './server';

(async () => {
  const serviceManager = new ServiceManager(config);
  const server = new Server(serviceManager, config);

  // Graceful shutdown from SIGTERM
  process.on('SIGTERM', async () => {
    log.warn('[app] [http] SIGTERM received stopping server');

    await server.stop();

    log.warn('[app] exiting');

    // eslint-disable-next-line no-process-exit
    process.exit(0);
  });

  process.on('unhandledRejection', (rejection, promise) => {
    log.error(`[app] unhandled rejection ${log.vars({ rejection, promise })}`);
  });

  try {
    await server.start();
  } catch (error) {
    log.error(`[app] [http] failed to start server ${log.vars({ error })}`);
  }
})();
