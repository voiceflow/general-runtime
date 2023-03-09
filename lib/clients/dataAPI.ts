import { VoiceflowProgram, VoiceflowVersion } from '@voiceflow/voiceflow-types';

import { CreatorDataApi, LocalDataApi } from '@/runtime';
import { Config } from '@/types';

import MongoDB from './mongodb';
import PrototypeDataAPI from './prototypeDataAPI';
import Static from './static';

/**
 * Build all clients
 */
class DataAPI {
  localDataApi?: LocalDataApi<VoiceflowProgram.Program, VoiceflowVersion.Version>;

  prototypeDataApi?: PrototypeDataAPI;

  creatorAPIAuthorization?: string;

  creatorDataApi?: (authorization: string) => CreatorDataApi<VoiceflowProgram.Program, VoiceflowVersion.Version>;

  constructor(
    { config, mongo }: { config: Config; mongo: MongoDB | null },
    API = { LocalDataApi, PrototypeDataAPI, CreatorDataApi }
  ) {
    const { PROJECT_SOURCE, CREATOR_API_AUTHORIZATION, CREATOR_API_ENDPOINT } = config;

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
    if (mongo) {
      this.prototypeDataApi = new API.PrototypeDataAPI(mongo);
    }

    // configuration not set
    if (!PROJECT_SOURCE && !mongo && !CREATOR_API_ENDPOINT) {
      throw new Error('no data API env configuration set');
    }
  }

  public async get(authorization = this.creatorAPIAuthorization) {
    if (this.creatorDataApi && authorization) {
      return this.creatorDataApi(authorization);
    }

    if (this.localDataApi) {
      return this.localDataApi;
    }

    if (this.prototypeDataApi) {
      return this.prototypeDataApi;
    }

    throw new Error('no data API env configuration set');
  }
}

export default DataAPI;
