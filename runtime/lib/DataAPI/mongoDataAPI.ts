import { BaseModels } from '@voiceflow/base-types';
import { AnyRecord } from 'dns';
import { Db, ObjectId } from 'mongodb';

import { DataAPI } from './types';
import { extractAPIKeyID } from './utils';

// shallow objectId to string
export const shallowObjectIdToString = <T extends Record<string, any>>(obj: T) => {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, value instanceof ObjectId ? value.toHexString() : value])
  ) as T;
};

class MongoDataAPI<
  P extends BaseModels.Program.Model<any, any>,
  V extends BaseModels.Version.Model<any>,
  PJ extends BaseModels.Project.Model<any, any> = BaseModels.Project.Model<AnyRecord, AnyRecord>
> implements DataAPI<P, V, PJ>
{
  protected client: Db;

  protected programsCollection = 'programs';

  protected versionsCollection = 'versions';

  protected projectsCollection = 'projects';

  constructor({ client }: { client: Db }) {
    this.client = client;
  }

  public getProgram = async (programID: string): Promise<P> => {
    const program = await this.client
      .collection(this.programsCollection)
      .findOne<(P & { _id: ObjectId; versionID: ObjectId }) | null>({ _id: new ObjectId(programID) });

    if (!program) throw new Error(`Program not found: ${programID}`);

    return shallowObjectIdToString(program);
  };

  public getVersion = async (versionID: string): Promise<V> => {
    const version = await this.client
      .collection(this.versionsCollection)
      .findOne<(V & { _id: ObjectId; projectID: ObjectId }) | null>({ _id: new ObjectId(versionID) });

    if (!version) throw new Error(`Version not found: ${versionID}`);

    return shallowObjectIdToString(version);
  };

  public getProject = async (projectID: string) => {
    const project = await this.client
      .collection(this.versionsCollection)
      .findOne<(PJ & { _id: ObjectId; devVersion: ObjectId; liveVersion: ObjectId }) | null>({
        _id: new ObjectId(projectID),
      });

    if (!project) throw new Error(`Project not found: ${projectID}`);

    return shallowObjectIdToString(project);
  };

  public getProjectUsingAPIKey = async (key: string): Promise<PJ> => {
    const apiKeyID = extractAPIKeyID(key);

    const { data } = await this.client.get<PJ>(`/api-key/${apiKeyID}/project`);
    return data;
  };
}

export default MongoDataAPI;
