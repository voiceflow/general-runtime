import Voiceflow, { Client } from '@voiceflow/api-sdk';
import { Models } from '@voiceflow/base-types';

import { DataAPI } from './types';

class CreatorDataAPI<
  P extends Models.Program<any, any>,
  V extends Models.Version<any>,
  PJ extends Models.Project<any, any> = Models.Project<Models.BasePlatformData, Models.BasePlatformData>
> implements DataAPI<P, V, PJ> {
  protected client: Client;

  private prototype: boolean;

  constructor(
    {
      endpoint,
      authorization,
      clientKey = '',
      prototype = true,
    }: {
      endpoint: string;
      authorization: string;
      clientKey?: string;
      prototype?: boolean;
    },
    VFClient = Voiceflow
  ) {
    this.client = new VFClient({ apiEndpoint: endpoint, clientKey }).generateClient({ authorization });

    this.prototype = prototype;
  }

  public init = async () => {
    // no-op
  };

  public fetchDisplayById = async (): Promise<null> => {
    return null;
  };

  public getProgram = async (programID: string) => {
    if (this.prototype) {
      return (await this.client.prototypeProgram.get(programID)) as P;
    }
    return (await this.client.program.get(programID)) as P;
  };

  public getVersion = async (versionID: string) => {
    return (await this.client.version.get(versionID)) as V;
  };

  public unhashVersionID = async (versionID: string) => versionID;

  public getProject = async (projectID: string) => {
    return (await this.client.project.get(projectID)) as PJ;
  };

  public getProjectUsingAuthorization = async (apiKey: string): Promise<PJ> => {
    // Extract the model _id from the key: VF.<type>.<id>.<hash>
    // Legacy workspace keys do not have a type, so we need to pad the split by one.
    const split = apiKey.split('.');
    const [, , _id] = split.length === 4 ? split : ['', ...split];

    const project = await this.client.fetch.get(`/api-keys/${_id}/project`);
    return project.data as PJ;
  };
}

export default CreatorDataAPI;
