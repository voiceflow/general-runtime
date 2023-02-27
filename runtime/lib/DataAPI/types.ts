import { AnyRecord, BaseModels, Project } from '@voiceflow/base-types';

export interface Display {
  document?: string;
}

export interface DataAPI<
  P extends BaseModels.Program.Model<any, any> = BaseModels.Program.Model<BaseModels.BaseNode, BaseModels.BaseCommand>,
  V extends BaseModels.Version.Model<any> = BaseModels.Version.Model<BaseModels.Version.PlatformData>,
  PJ extends BaseModels.Project.Model<any, any> = BaseModels.Project.Model<AnyRecord, AnyRecord>
> {
  fetchDisplayById(displayId: number): Promise<null | Display>;

  getProgram(programID: string): Promise<P>;

  getVersion(versionID: string): Promise<V>;

  getProject(projectID: string): Promise<PJ>;

  getProjectNLP(projectID: string): Promise<{
    nlp?: BaseModels.Project.PrototypeNLP;
    devVersion?: string;
    liveVersion?: string;
    platformData?: Project.PlatformData;
  }>;

  getProjectUsingAPIKey(key: string): Promise<PJ>;
}
