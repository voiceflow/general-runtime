import { BaseModels } from '@voiceflow/base-types';
import { AxiosInstance, AxiosStatic } from 'axios';
import { AnyRecord } from 'dns';
import moize from 'moize';
import { ObjectId } from 'mongodb';

import { DataAPI, Display } from './types';

class ServerDataAPI<
  P extends BaseModels.Program.Model<any, any>,
  V extends BaseModels.Version.Model<any>,
  PJ extends BaseModels.Project.Model<any, any> = BaseModels.Project.Model<AnyRecord, AnyRecord>
> implements DataAPI<P, V, PJ> {
  protected client!: AxiosInstance;

  private axios: AxiosStatic;

  private platform: string;

  private dataEndpoint: string;

  private adminToken: string;

  constructor(
    { platform, adminToken, dataEndpoint }: { platform: string; adminToken: string; dataEndpoint: string },
    { axios }: { axios: AxiosStatic }
  ) {
    this.axios = axios;
    this.platform = platform;
    this.adminToken = adminToken;
    this.dataEndpoint = dataEndpoint;
  }

  public init = async () => {
    const {
      data: { token: VF_DATA_SECRET },
    } = await this.axios.post(
      `${this.dataEndpoint}/generate-platform-token`,
      { platform: this.platform, ttl_min: 525600 },
      { headers: { admintoken: this.adminToken } }
    );

    this.client = this.axios.create({
      baseURL: this.dataEndpoint,
      headers: { authorization: `Bearer ${VF_DATA_SECRET}` },
    });
  };

  public fetchDisplayById = async (displayId: number): Promise<null | Display> => {
    const { data }: { data: undefined | null | Display } = await this.client.get(`/metadata/displays/${displayId}`);

    return data ?? null;
  };

  public getProgram = async (programID: string): Promise<P> => {
    const { data } = await this.client.get<P>(`/diagrams/${programID}`);

    return data;
  };

  public getVersion = async (versionID: string): Promise<V> => {
    const { data } = await this.client.get<V>(`/version/${versionID}`);

    return data;
  };

  public unhashVersionID = async (versionID: string): Promise<string> => {
    if (versionID.length === 24 && ObjectId.isValid(versionID)) return versionID;

    return this._convertSkillID(versionID);
  };

  private _convertSkillID = moize(
    async (skillID: string) => {
      const { data } = await this.client.get<string>(`/version/convert/${skillID}`);

      return data;
    },
    { maxSize: 1000 }
  );

  public getProject = async (projectID: string) => {
    const { data } = await this.client.get<PJ>(`/project/${projectID}`);

    return data;
  };
}

export default ServerDataAPI;
