import { Models } from '@voiceflow/base-types';

export type Display = { document?: string };

export interface DataAPI<
  P extends Models.Program<any, any> = Models.Program<Models.BaseNode, Models.BaseCommand>,
  V extends Models.Version<any> = Models.Version<Models.VersionPlatformData>,
  PJ extends Models.Project<any, any> = Models.Project<Models.BasePlatformData, Models.BasePlatformData>
> {
  init(): Promise<void>;

  fetchDisplayById(displayId: number): Promise<null | Display>;

  getProgram(programID: string): Promise<P>;

  getVersion(versionID: string): Promise<V>;

  unhashVersionID(versionID: string): Promise<string>;

  getProject(projectID: string): Promise<PJ>;
}
