/* eslint no-process-exit: "off", no-process-env: "off" */

import { once } from 'events';
import express, { Express } from 'express';
import fs from 'fs';
import http from 'http';
import https from 'https';

import { ExpressMiddleware, ServiceManager } from './backend';
import log from './logger';
import pjson from './package.json';
import { Config } from './types';

const name = pjson.name.replace(/^@[\dA-Za-z-]+\//g, '');

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

    this.app = express();

    if (process.env.NODE_ENV === 'e2e') {
      this.server = https.createServer(
        {
          key: fs.readFileSync('./certs/localhost.key'),
          cert: fs.readFileSync('./certs/localhost.crt'),
          requestCert: false,
          rejectUnauthorized: false,
        },
        this.app
      );
    } else {
      this.server = http.createServer(this.app);
    }

    // nodeJS keepAliveTimeout has to be higher than downstream nginx keepAliveTimeout (default 75s)
    this.server.keepAliveTimeout = 76 * 1000;
    this.server.headersTimeout = 77 * 1000;

    const { middlewares, controllers } = this.serviceManager;

    ExpressMiddleware.attach(this.app, middlewares, controllers);

    this.server.listen(this.config.PORT);
    await once(this.server, 'listening');

    log.info(`[http] ${name} listening ${log.vars({ port: this.config.PORT })}`);
  }

  /**
   * Stop server
   * - stops accepting new connections, wait for all existing ones to drain, then stop services
   */
  async stop() {
    if (this.server) {
      this.server.close();
      await once(this.server, 'close');
    }

    // Stop services
    await this.serviceManager.stop();
  }
}

export default Server;
