import { CreatorDataApi, DataAPI, LocalDataApi } from '@voiceflow/runtime';

import { Config } from '@/types';

import RemoteDataAPI from './remoteDataAPI';
import Static from './static';

/**
 * Build all clients
 */
export default (config: Config, API = { LocalDataApi, RemoteDataAPI, CreatorDataApi }) => {
  const { PROJECT_SOURCE, ADMIN_SERVER_DATA_API_TOKEN, VF_DATA_ENDPOINT, CREATOR_API_AUTHORIZATION, CREATOR_API_ENDPOINT } = config;
  let dataAPI: DataAPI<any, any>;

  // fetch from local VF file
  if (PROJECT_SOURCE) {
    dataAPI = new API.LocalDataApi({ projectSource: PROJECT_SOURCE }, { fs: Static.fs, path: Static.path });
  }

  // fetch from server-data-api
  else if (ADMIN_SERVER_DATA_API_TOKEN && VF_DATA_ENDPOINT) {
    dataAPI = new API.RemoteDataAPI(
      { platform: 'general', adminToken: ADMIN_SERVER_DATA_API_TOKEN, dataEndpoint: VF_DATA_ENDPOINT },
      { axios: Static.axios }
    );
  }

  // fetch from creator-api
  else if (CREATOR_API_AUTHORIZATION && CREATOR_API_ENDPOINT) {
    dataAPI = new API.CreatorDataApi({ endpoint: `${CREATOR_API_ENDPOINT}/v2`, authorization: CREATOR_API_AUTHORIZATION });
  }

  // configuration not set
  else {
    throw new Error('no data API env configuration set');
  }

  return dataAPI;
};
