import { BasePlatformData, Command, Node, Program, Project, Version, VersionPlatformData } from '@voiceflow/api-sdk';

export type Display = { document?: string };

export interface DataAPI<
  P extends Program<any, any> = Program<Node, Command>,
  V extends Version<any> = Version<VersionPlatformData>,
  PJ extends Project<any, any> = Project<BasePlatformData, BasePlatformData>
> {
  init(): Promise<void>;

  fetchDisplayById(displayId: number): Promise<null | Display>;

  getProgram(programID: string): Promise<P>;

  getVersion(versionID: string): Promise<V>;

  getProject(projectID: string): Promise<PJ>;
}
