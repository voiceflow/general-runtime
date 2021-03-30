/* eslint-disable class-methods-use-this, no-empty-function */

import { buildClients, buildControllers, buildMiddleware, buildServices, ClientMap, ControllerMap, FullServiceMap, MiddlewareMap } from '@/lib';
import { initClients, stopClients } from '@/lib/clients';
import { Config } from '@/types';

class ServiceManager {
  clients: ClientMap;

  services: FullServiceMap;

  middlewares: MiddlewareMap;

  controllers: ControllerMap;

  constructor(public config: Config) {
    // Clients
    this.clients = buildClients(config);

    // Services
    this.services = buildServices(config, this.clients);

    // Middleware
    this.middlewares = buildMiddleware(this.services, config);

    // Controllers
    this.controllers = buildControllers(this.services, config);
  }

  /**
   * Start services
   */
  async start() {
    await initClients(this.clients);
  }

  /**
   * Stop services
   */
  async stop() {
    await stopClients(this.config, this.clients);
  }
}

export default ServiceManager;
