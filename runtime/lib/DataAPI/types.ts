import { AnyRecord, BaseModels } from '@voiceflow/base-types';

export interface Display {
  document?: string;
}

export interface DataAPI<
  P extends BaseModels.Program.Model<any, any> = BaseModels.Program.Model<
    BaseModels.BaseNode,
    BaseModels.BaseCommand
  >,
  V extends BaseModels.Version.Model<any> = BaseModels.Version.Model<BaseModels.Version.PlatformData>,
  PJ extends BaseModels.Project.Model<any, any> = BaseModels.Project.Model<AnyRecord, AnyRecord>
> {
  getProgram(versionID: string, diagramID: string): Promise<P>;

  getVersion(versionID: string): Promise<V>;

  getProject(projectID: string): Promise<PJ>;

  getKBDocuments(
    projectID: string,
    documentIDs: string[]
  ): Promise<Record<string, BaseModels.Project.KnowledgeBaseDocument | null>>;

  hasKBDocuments(projectID: string): Promise<boolean>;
}
