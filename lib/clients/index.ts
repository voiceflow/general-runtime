import { DataAPI, LocalDataApi } from '@voiceflow/runtime';

import { Config } from '@/types';

import Metrics, { MetricsType } from './metrics';
import RemoteDataAPI from './remoteDataAPI';
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
    : new RemoteDataAPI(
        { platform: 'general', adminToken: config.ADMIN_SERVER_DATA_API_TOKEN, dataEndpoint: config.VF_DATA_ENDPOINT },
        { axios: Static.axios }
      );

  return {
    ...Static,
    dataAPI,
    metrics: Metrics(config),
  };
};

export const initClients = async (clients: ClientMap) => {
  await clients.dataAPI.init();
};

export default buildClients;
