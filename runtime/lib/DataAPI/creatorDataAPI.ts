import Voiceflow, { Client } from '@voiceflow/api-sdk';
import { AnyRecord, BaseModels } from '@voiceflow/base-types';

import { DataAPI } from './types';

class CreatorDataAPI<
  P extends BaseModels.Program.Model<any, any> = BaseModels.Program.Model<any, any>,
  V extends BaseModels.Version.Model<any> = BaseModels.Version.Model<any>,
  PJ extends BaseModels.Project.Model<any, any> = BaseModels.Project.Model<AnyRecord, AnyRecord>
> implements DataAPI<P, V, PJ>
{
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

  /**
   * Fetch a subset of project data specifically for runtime prediction
   */
  public getProjectNLP = async (projectID: string) => {
    const { data } = await this.client.fetch.get<any>(`/projects/${projectID}/nlp`);

    return data;
  };

  public getProjectUsingAPIKey = async (key: string): Promise<PJ> => {
    const apiKeyID = BaseModels.ApiKey.extractAPIKeyID(key);

    const { data } = await this.client.fetch.get<PJ>(`/api-keys/${apiKeyID}/project`);
    return data;
  };
}

export default CreatorDataAPI;
