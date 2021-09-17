import { PlatformType } from '@voiceflow/internal';

import { CreatorDataApi, LocalDataApi } from '@/runtime';
import { Config } from '@/types';

import RemoteDataAPI from './remoteDataAPI';
import Static from './static';

/**
 * Build all clients
 */
class DataAPI {
  localDataApi?: LocalDataApi<any, any>;

  remoteDataApi?: RemoteDataAPI;

  creatorAPIAuthorization?: string;

  creatorDataApi?: (authorization: string) => CreatorDataApi<any, any, any>;

  constructor(config: Config, API = { LocalDataApi, RemoteDataAPI, CreatorDataApi }) {
    const { PROJECT_SOURCE, ADMIN_SERVER_DATA_API_TOKEN, VF_DATA_ENDPOINT, CREATOR_API_AUTHORIZATION, CREATOR_API_ENDPOINT } = config;

    if (CREATOR_API_ENDPOINT) {
      this.creatorAPIAuthorization = CREATOR_API_AUTHORIZATION || '';
      this.creatorDataApi = (authorization) =>
        new API.CreatorDataApi({
          endpoint: `${CREATOR_API_ENDPOINT}/v2`,
          authorization,
        });
    }

    // fetch from local VF file
    if (PROJECT_SOURCE) {
      this.localDataApi = new API.LocalDataApi({ projectSource: PROJECT_SOURCE }, { fs: Static.fs, path: Static.path });
    }

    // fetch from server-data-api
    if (ADMIN_SERVER_DATA_API_TOKEN && VF_DATA_ENDPOINT) {
      this.remoteDataApi = new API.RemoteDataAPI(
        { platform: PlatformType.GENERAL, adminToken: ADMIN_SERVER_DATA_API_TOKEN, dataEndpoint: VF_DATA_ENDPOINT },
        { axios: Static.axios }
      );
    }

    // configuration not set
    if (!PROJECT_SOURCE && (!VF_DATA_ENDPOINT || !ADMIN_SERVER_DATA_API_TOKEN) && !CREATOR_API_ENDPOINT) {
      throw new Error('no data API env configuration set');
    }
  }

  public async init() {
    await this.localDataApi?.init();
    await this.remoteDataApi?.init();
  }

  public async get(authorization = this.creatorAPIAuthorization) {
    if (this.creatorDataApi && authorization) {
      const dataApi = this.creatorDataApi(authorization);
      await dataApi.init();
      return dataApi;
    }

    if (this.localDataApi) {
      return this.localDataApi;
    }

    if (this.remoteDataApi) {
      return this.remoteDataApi;
    }

    throw new Error('no data API env configuration set');
  }
}

export default DataAPI;
