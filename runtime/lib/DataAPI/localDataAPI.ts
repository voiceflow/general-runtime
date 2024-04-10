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

  constructor(
    { projectSource }: { projectSource: string },
    { fs, path }: { fs: typeof FS; path: typeof Path }
  ) {
    if (!projectSource) throw new Error('project source undefined');

    const content = JSON.parse(fs.readFileSync(path.join('projects', projectSource), 'utf8'));

    if (!content.programs || !Object.keys(content.programs).length) {
      throw new Error('[invalid VFR] no programs included');
    }

    if (!Object.keys(content.programs).includes(content.version._id)) {
      throw new Error('[invalid VFR] missing base program');
    }

    this.version = content.version;
    this.project = content.project;
    this.programs = content.programs;
  }

  public getVersion = async () => this.version;

  public getProgram = async (_versionID: string, diagramID: string) =>
    this.programs[diagramID] ?? null;

  public getProject = async () => this.project;

  public getVersionPublishing = async () => this.version.platformData?.publishing || {};

  public getKBDocuments = async () => this.project.knowledgeBase?.documents || {};

  public hasKBDocuments = async () =>
    Object.keys(this.project.knowledgeBase?.documents || {}).length > 0;
}

export default LocalDataAPI;
