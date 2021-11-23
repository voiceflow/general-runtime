import { Models } from '@voiceflow/base-types';
import * as FS from 'fs';
import * as Path from 'path';

import { DataAPI } from './types';

class LocalDataAPI<
  P extends Models.Program<any, any>,
  V extends Models.Version<any>,
  PJ extends Models.Project<any, any> = Models.Project<Models.BasePlatformData, Models.BasePlatformData>
> implements DataAPI<P, V, PJ> {
  private version: V;

  private project: PJ;

  private programs: Record<string, P>;

  constructor({ projectSource }: { projectSource: string }, { fs, path }: { fs: typeof FS; path: typeof Path }) {
    if (!projectSource) throw new Error('project source undefined');

    const content = JSON.parse(fs.readFileSync(path.join('projects', projectSource), 'utf8'));

    this.version = content.version;
    this.project = content.project;
    this.programs = content.programs;
  }

  public init = async () => {
    // no-op
  };

  public getVersion = async () => this.version;

  public unhashVersionID = async (versionID: string) => versionID;

  public getProgram = async (programID: string) => this.programs[programID];

  public getProject = async () => this.project;

  public fetchDisplayById = async () => null;
}

export default LocalDataAPI;
