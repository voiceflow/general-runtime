import Voiceflow, { BasePlatformData, Client, Program, Project, Version } from '@voiceflow/api-sdk';

import { DataAPI } from './types';

class CreatorDataAPI<P extends Program<any, any>, V extends Version<any>, PJ extends Project<any, any> = Project<BasePlatformData, BasePlatformData>>
  implements DataAPI<P, V, PJ> {
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

  public getProject = async (projectID: string) => {
    return (await this.client.project.get(projectID)) as PJ;
  };
}

export default CreatorDataAPI;
