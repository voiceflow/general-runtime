/* eslint no-process-exit: "off", no-process-env: "off" */
import Promise from 'bluebird';
import express, { Express } from 'express';
import http from 'http';
import https from 'https';

import { ExpressMiddleware, ServiceManager } from './backend';
import pjson from './package.json';
import { Config } from './types';

const name = pjson.name.replace(/^@[a-zA-Z0-9-]+\//g, '');

/**
 * @class
 */
class Server {
  app: Express | null = null;

  server: https.Server | http.Server | null = null;

  constructor(public serviceManager: ServiceManager, public config: Config) {}

  /**
   * Start server
   * - Creates express app and services
   */
  async start() {
    // Start services.
    await this.serviceManager.start();

    const app = express();
    const server = http.createServer(app);

    const { middlewares, controllers } = this.serviceManager;

    this.app = app;
    this.server = server;

    ExpressMiddleware.attach(app, middlewares, controllers);

    await Promise.fromCallback((cb: any) => server.listen(this.config.PORT, cb));

    // eslint-disable-next-line no-console
    console.log(`${name} listening on port ${this.config.PORT}`);
  }

  /**
   * Stop server
   * - Stops services first, then server
   */
  async stop() {
    // Stop services
    await this.serviceManager.stop();
    await Promise.fromCallback((cb) => this.server && this.server.close(cb));
  }
}

export default Server;
