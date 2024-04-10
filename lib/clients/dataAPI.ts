import { VoiceflowProgram, VoiceflowVersion } from '@voiceflow/voiceflow-types';

import { LocalDataApi } from '@/runtime';
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

  constructor(
    { config, mongo }: { config: Config; mongo: MongoDB | null },
    API = { LocalDataApi, PrototypeDataAPI }
  ) {
    const { PROJECT_SOURCE } = config;

    // fetch from local VF file
    if (PROJECT_SOURCE) {
      this.localDataApi = new API.LocalDataApi(
        { projectSource: PROJECT_SOURCE },
        { fs: Static.fs, path: Static.path }
      );
    }

    // fetch from server-data-api
    if (mongo) {
      this.prototypeDataApi = new API.PrototypeDataAPI(mongo);
    }

    // configuration not set
    if (!PROJECT_SOURCE && !mongo) {
      throw new Error('no data API env configuration set');
    }
  }

  public async get() {
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
