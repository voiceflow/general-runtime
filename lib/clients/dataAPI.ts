import { CreatorDataApi, LocalDataApi } from '@voiceflow/runtime';

import { Config } from '@/types';

import RemoteDataAPI from './remoteDataAPI';
import Static from './static';

/**
 * Build all clients
 */
class DataAPI {
  creatorAppEndpoint: string;

  projectSource: string | null;

  vfDataEndpoint: string | null;

  adminServerDataAPIToken: string | null;

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

    this.creatorAppEndpoint = CREATOR_APP_ORIGIN ?? '';
    this.projectSource = PROJECT_SOURCE;
    this.vfDataEndpoint = VF_DATA_ENDPOINT;
    this.adminServerDataAPIToken = ADMIN_SERVER_DATA_API_TOKEN;
    this.creatorAPIEndpoint = CREATOR_API_ENDPOINT;
    this.creatorAPIAuthorization = CREATOR_API_AUTHORIZATION ?? '';
    this.api = API;

    // configuration not set
    if (!PROJECT_SOURCE && (!VF_DATA_ENDPOINT || !ADMIN_SERVER_DATA_API_TOKEN) && !CREATOR_API_ENDPOINT) {
      throw new Error('no data API env configuration set');
    }
  }

  public async get(authorization?: string, origin?: string) {
    if (this.projectSource) {
      // fetch from local VF file
      const dataApi = new this.api.LocalDataApi({ projectSource: this.projectSource }, { fs: Static.fs, path: Static.path });
      await dataApi.init();
      return dataApi;
    }
    if (origin === this.creatorAppEndpoint) {
      // fetch from server-data-api
      if (!this.vfDataEndpoint || !this.adminServerDataAPIToken) {
        throw new Error('no remote data API env configuration set');
      }

      const dataApi = new this.api.RemoteDataAPI(
        { platform: 'general', adminToken: this.adminServerDataAPIToken, dataEndpoint: this.vfDataEndpoint },
        { axios: Static.axios }
      );
      await dataApi.init();
      return dataApi;
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
