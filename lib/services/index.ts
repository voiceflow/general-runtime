import { Config } from '@/types';

import { ClientMap } from '../clients';
import Runtime from './runtime';
import State from './state';

export interface ServiceMap {
  runtime: Runtime;
  state: State;
}

export interface FullServiceMap extends ClientMap, ServiceMap {}

/**
 * Build all services
 */
const buildServices = (config: Config, clients: ClientMap): FullServiceMap => {
  const services = {
    ...clients,
  } as FullServiceMap;

  services.runtime = new Runtime(services, config);
  services.state = new State(services, config);

  return services;
};

export default buildServices;
