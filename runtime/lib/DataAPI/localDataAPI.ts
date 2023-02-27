import { AnyRecord, BaseModels } from '@voiceflow/base-types';
import * as FS from 'fs';
import * as Path from 'path';

import { DataAPI } from './types';

class LocalDataAPI<
  P extends BaseModels.Program.Model<any, any> = BaseModels.Program.Model<any, any>,
  V extends BaseModels.Version.Model<any> = BaseModels.Version.Model<any>,
  PJ extends BaseModels.Project.Model<any, any> = BaseModels.Project.Model<AnyRecord, AnyRecord>
> implements DataAPI<P, V, PJ>
{
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

  public getVersion = async () => this.version;

  public unhashVersionID = async (versionID: string) => versionID;

  public getProgram = async (programID: string) => this.programs[programID];

  public getProject = async () => this.project;

  public fetchDisplayById = async () => null;

  public getProjectNLP = async () => {
    return {
      nlp: this.project.prototype?.nlp,
      devVersion: this.project.devVersion,
      liveVersion: this.project.liveVersion,
      platformData: this.project.platformData,
    };
  };

  public getProjectUsingAPIKey = async () => this.project;
}

export default LocalDataAPI;
