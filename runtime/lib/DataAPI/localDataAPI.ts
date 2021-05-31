import { BasePlatformData, Program, Project, Version } from '@voiceflow/api-sdk';
import * as FS from 'fs';
import * as Path from 'path';

import { DataAPI } from './types';

class LocalDataAPI<P extends Program<any, any>, V extends Version<any>, PJ extends Project<any, any> = Project<BasePlatformData, BasePlatformData>>
  implements DataAPI<P, V, PJ> {
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

  public getProgram = async (programID: string) => this.programs[programID];

  public getProject = async () => this.project;

  public fetchDisplayById = async () => null;
}

export default LocalDataAPI;
