/* eslint no-process-exit: "off", no-process-env: "off" */
import Promise from 'bluebird';
import express, { Express } from 'express';
import fs from 'fs';
import http from 'http';
import https from 'https';

import { ExpressMiddleware, ServiceManager } from './backend';
import pjson from './package.json';
import { Config } from './types';

const name = pjson.name.replace(/^@[a-zA-Z0-9-]+\//g, '');
const KEY_PATH = './certs/localhost.key';
const CERT_PATH = './certs/localhost.crt';

enum Protocol {
  HTTPS = 'https',
  HTTP = 'http',
}

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

    const { middlewares, controllers } = this.serviceManager;

    this.app = app;

    const protocol = process.env.NODE_ENV === 'local' && fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH) ? Protocol.HTTPS : Protocol.HTTP;

    this.server =
      protocol === Protocol.HTTPS
        ? https.createServer(
            {
              key: fs.readFileSync(KEY_PATH),
              cert: fs.readFileSync(CERT_PATH),
              requestCert: false,
              rejectUnauthorized: false,
            },
            this.app
          )
        : http.createServer(this.app);

    ExpressMiddleware.attach(app, middlewares, controllers);

    await Promise.fromCallback((cb: any) => this.server!.listen(this.config.PORT, cb));

    // eslint-disable-next-line no-console
    console.log(`${name} listening on ${protocol} port ${this.config.PORT}`);
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
