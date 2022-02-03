import { AnyRecord, BaseModels } from '@voiceflow/base-types';

export type Display = { document?: string };

export interface DataAPI<
  P extends BaseModels.Program.Model<any, any> = BaseModels.Program.Model<BaseModels.BaseNode, BaseModels.BaseCommand>,
  V extends BaseModels.Version.Model<any> = BaseModels.Version.Model<BaseModels.Version.PlatformData>,
  PJ extends BaseModels.Project.Model<any, any> = BaseModels.Project.Model<AnyRecord, AnyRecord>
> {
  init(): Promise<void>;

  fetchDisplayById(displayId: number): Promise<null | Display>;

  getProgram(programID: string): Promise<P>;

  getVersion(versionID: string): Promise<V>;

  unhashVersionID(versionID: string): Promise<string>;

  getProject(projectID: string): Promise<PJ>;
}
