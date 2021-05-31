import { BasePlatformData, Program, Project, Version } from '@voiceflow/api-sdk';
import { AxiosInstance, AxiosStatic } from 'axios';

import { DataAPI, Display } from './types';

class ServerDataAPI<P extends Program<any, any>, V extends Version<any>, PJ extends Project<any, any> = Project<BasePlatformData, BasePlatformData>>
  implements DataAPI<P, V, PJ> {
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

  public getProgram = async (programID: string) => {
    const { data } = await this.client.get<P>(`/diagrams/${programID}`);

    return data;
  };

  public getVersion = async (versionID: string) => {
    const { data } = await this.client.get<V>(`/version/${versionID}`);

    return data;
  };

  public getProject = async (projectID: string) => {
    const { data } = await this.client.get<PJ>(`/project/${projectID}`);

    return data;
  };
}

export default ServerDataAPI;
