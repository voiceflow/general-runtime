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

  creatorDataApi: CreatorDataApi<any, any> | undefined;

  creatorAppEndpoint = '';

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

    // fetch from creator-api
    if (CREATOR_API_ENDPOINT) {
      this.creatorDataApi = new API.CreatorDataApi({ endpoint: `${CREATOR_API_ENDPOINT}/v2`, authorization: CREATOR_API_AUTHORIZATION ?? undefined });
    }

    // configuration not set
    if (!this.localDataApi && !this.remoteDataApi && !this.creatorDataApi) {
      throw new Error('no data API env configuration set');
    }
  }

  public async init() {
    await this.localDataApi?.init();
    await this.remoteDataApi?.init();
    await this.creatorDataApi?.init();
  }

  public get(authorization?: string, origin?: string) {
    if (this.localDataApi) {
      return this.localDataApi;
    }
    if (origin === this.creatorAppEndpoint) {
      if (!this.remoteDataApi) {
        throw new Error('no remote data API env configuration set');
      }

      return this.remoteDataApi;
    }
    if (!this.creatorDataApi) {
      throw new Error('no creator data API env configuration set');
    }

    this.creatorDataApi!.updateAuthorization(authorization);
    return this.creatorDataApi;
  }
}

export default DataAPI;
