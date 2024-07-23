import 'core-js';
import 'regenerator-runtime/runtime';
import './tracer';

import cluster from 'cluster';
import os from 'os';

import { ServiceManager } from './backend';
import config from './config';
import log from './logger';
import Server from './server';

const numCPUs = Math.min(os.cpus().length, Number(process.env.MAX_WORKERS) || Infinity);

if (cluster.isPrimary) {
  log.info(`[app] [cluster] Master ${process.pid} is running`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    log.warn(`[app] [cluster] Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
    log.info('[app] [cluster] Starting a new worker');
    cluster.fork();
  });
} else {
  const masterPID = cluster.worker?.process.pid;

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

  server.start().catch((error) => {
    log.error(`[app] [http] failed to start server ${log.vars({ error })}`);
    throw error;
  });
}
