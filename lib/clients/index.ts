import { Config } from '@/types';

import DataAPI from './dataAPI';
import Metrics, { MetricsType } from './metrics';
import Static, { StaticType } from './static';

export interface ClientMap extends StaticType {
  dataAPI: DataAPI;
  metrics: MetricsType;
}

/**
 * Build all clients
 */
const buildClients = (config: Config): ClientMap => {
  return {
    ...Static,
    dataAPI: new DataAPI(config),
    metrics: Metrics(config),
  };
};

export const initClients = async () => {
  // no-op
};

export default buildClients;
