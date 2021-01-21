import { CreatorDataApi, DataAPI, LocalDataApi } from '@voiceflow/runtime';

import { Config } from '@/types';

import RemoteDataAPI from './remoteDataAPI';
import Static from './static';

/**
 * Build all clients
 */
export default (config: Config) => {
  let dataAPI: DataAPI<any, any>;
  if (config.PROJECT_SOURCE) {
    dataAPI = new LocalDataApi({ projectSource: config.PROJECT_SOURCE }, { fs: Static.fs, path: Static.path });
  } else if (config.ADMIN_SERVER_DATA_API_TOKEN && config.VF_DATA_ENDPOINT) {
    dataAPI = new RemoteDataAPI(
      { platform: 'general', adminToken: config.ADMIN_SERVER_DATA_API_TOKEN, dataEndpoint: config.VF_DATA_ENDPOINT },
      { axios: Static.axios }
    );
  } else if (config.CREATOR_API_AUTHORIZATION && config.CREATOR_API_ENDPOINT) {
    dataAPI = new CreatorDataApi({ endpoint: `${config.CREATOR_API_ENDPOINT}/v2`, authorization: config.CREATOR_API_AUTHORIZATION });
  } else {
    throw new Error('no data API env configuration set');
  }

  return dataAPI;
};
