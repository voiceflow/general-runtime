import { AnyRecord, BaseModels } from '@voiceflow/base-types';
import * as FS from 'fs';
import * as Path from 'path';

import { DataAPI } from './types';

class LocalDataAPI<
  P extends BaseModels.Program.Model<any, any> = BaseModels.Program.Model<any, any>,
  V extends BaseModels.Version.Model<any> = BaseModels.Version.Model<any>,
  PJ extends BaseModels.Project.Model<any, any> = BaseModels.Project.Model<AnyRecord, AnyRecord>,
  VS extends BaseModels.VariableState.Model = BaseModels.VariableState.Model
> implements DataAPI<P, V, PJ, VS>
{
  private version: V;

  private project: PJ;

  private programs: Record<string, P>;

  private variableState: VS;

  constructor({ projectSource }: { projectSource: string }, { fs, path }: { fs: typeof FS; path: typeof Path }) {
    if (!projectSource) throw new Error('project source undefined');

    const content = JSON.parse(fs.readFileSync(path.join('projects', projectSource), 'utf8'));

    this.version = content.version;
    this.project = content.project;
    this.programs = content.programs;
    this.variableState = content.variableState;
  }

  public getVersion = async () => this.version;

  public getProgram = async (programID: string) => this.programs[programID];

  public getProject = async () => this.project;

  public getVariableState = async () => this.variableState;
}

export default LocalDataAPI;
