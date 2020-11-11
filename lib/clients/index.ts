import { DataAPI, LocalDataApi, ServerDataApi } from '@voiceflow/runtime';

import { Config } from '@/types';

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
  const dataAPI = config.PROJECT_SOURCE
    ? new LocalDataApi({ projectSource: config.PROJECT_SOURCE }, { fs: Static.fs, path: Static.path })
    : new ServerDataApi({ adminToken: config.ADMIN_SERVER_DATA_API_TOKEN, dataEndpoint: config.VF_DATA_ENDPOINT }, { axios: Static.axios });
  const metrics = Metrics(config);

  return {
    ...Static,
    dataAPI,
    metrics,
  };
};

export const initClients = async (clients: ClientMap) => {
  await clients.dataAPI.init();
};

export default buildClients;
