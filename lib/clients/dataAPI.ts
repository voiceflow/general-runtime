import { CreatorDataApi, LocalDataApi } from '@voiceflow/runtime';

import { Config } from '@/types';

import RemoteDataAPI from './remoteDataAPI';
import Static from './static';

/**
 * Build all clients
 */
class DataAPI {
  localDataApi: LocalDataApi<any, any> | undefined;

  remoteDataApi: RemoteDataAPI | undefined;

  creatorAppOrigin: string | null;

  creatorAPIEndpoint: string | null;

  creatorAPIAuthorization: string;

  api: {
    LocalDataApi: typeof LocalDataApi;
    RemoteDataAPI: typeof RemoteDataAPI;
    CreatorDataApi: typeof CreatorDataApi;
  };

  constructor(config: Config, API = { LocalDataApi, RemoteDataAPI, CreatorDataApi }) {
    const {
      PROJECT_SOURCE,
      ADMIN_SERVER_DATA_API_TOKEN,
      VF_DATA_ENDPOINT,
      CREATOR_API_AUTHORIZATION,
      CREATOR_API_ENDPOINT,
      CREATOR_APP_ORIGIN,
    } = config;

    this.creatorAppOrigin = CREATOR_APP_ORIGIN;
    this.creatorAPIEndpoint = CREATOR_API_ENDPOINT;
    this.creatorAPIAuthorization = CREATOR_API_AUTHORIZATION ?? '';
    this.api = API;

    // fetch from local VF file
    if (PROJECT_SOURCE) {
      this.localDataApi = new API.LocalDataApi({ projectSource: PROJECT_SOURCE }, { fs: Static.fs, path: Static.path });
    }

    // fetch from server-data-api
    if (ADMIN_SERVER_DATA_API_TOKEN && VF_DATA_ENDPOINT) {
      this.remoteDataApi = new API.RemoteDataAPI(
        { platform: 'general', adminToken: ADMIN_SERVER_DATA_API_TOKEN, dataEndpoint: VF_DATA_ENDPOINT },
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

  public async get(authorization?: string, origin?: string) {
    if (this.localDataApi) {
      return this.localDataApi;
    }
    if (this.creatorAppOrigin && origin === this.creatorAppOrigin) {
      if (!this.remoteDataApi) {
        throw new Error('no remote data API env configuration set');
      }

      return this.remoteDataApi;
    }

    // fetch from creator-api
    if (!this.creatorAPIEndpoint) {
      throw new Error('no creator data API env configuration set');
    }

    const dataApi = new this.api.CreatorDataApi({
      endpoint: `${this.creatorAPIEndpoint}/v2`,
      authorization: authorization || this.creatorAPIAuthorization,
    });
    await dataApi.init();
    return dataApi;
  }
}

export default DataAPI;
