import { BaseModels } from '@voiceflow/base-types';
import { AnyRecord } from 'dns';
import { Db, ObjectId } from 'mongodb';

import { DataAPI } from './types';

// shallow objectId to string
export const shallowObjectIdToString = <T extends Record<string, any>>(obj: T): T => {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, value instanceof ObjectId ? value.toHexString() : value])
  ) as T;
};

interface Client {
  db: Db;
}

class MongoDataAPI<
  P extends BaseModels.Program.Model<any, any>,
  V extends BaseModels.Version.Model<any>,
  PJ extends BaseModels.Project.Model<any, any> = BaseModels.Project.Model<AnyRecord, AnyRecord>
> implements DataAPI<P, V, PJ>
{
  protected client: Client;

  protected programsCollection = 'programs';

  protected versionsCollection = 'versions';

  protected projectsCollection = 'projects';

  constructor(client: Client) {
    this.client = client;
  }

  public getProgram = async (programID: string): Promise<P> => {
    if (!ObjectId.isValid(programID)) return this.getLegacyProgram(programID);

    const program = await this.client.db
      .collection(this.programsCollection)
      .findOne<(P & { _id: ObjectId; versionID: ObjectId }) | null>({ _id: new ObjectId(programID) });

    if (!program) throw new Error(`Program not found: ${programID}`);

    return shallowObjectIdToString(program);
  };

  public getVersion = async (versionID: string): Promise<V> => {
    if (!ObjectId.isValid(versionID)) return this.getLegacyVersion(versionID);

    const version = await this.client.db
      .collection(this.versionsCollection)
      .findOne<(V & { _id: ObjectId; projectID: ObjectId }) | null>({ _id: new ObjectId(versionID) });

    if (!version) throw new Error(`Version not found: ${versionID}`);

    return shallowObjectIdToString(version);
  };

  public getProject = async (projectID: string) => {
    const project = await this.client.db
      .collection(this.projectsCollection)
      .findOne<(PJ & { _id: ObjectId; devVersion: ObjectId; liveVersion: ObjectId }) | null>({
        _id: new ObjectId(projectID),
      });

    if (!project) throw new Error(`Project not found: ${projectID}`);

    return shallowObjectIdToString(project);
  };

  /** @deprecated legacy versionID for alexa */
  private getLegacyVersion = async (legacyID: string) => {
    const version = await this.client.db
      .collection(this.versionsCollection)
      .findOne<(V & { _id: ObjectId; projectID: ObjectId }) | null>({ legacyID });

    if (!version) throw new Error(`Version not found: ${version}`);

    const program = await this.client.db
      .collection(this.programsCollection)
      .findOne<{ legacyID: string } | null>(
        { programID: new ObjectId(version.rootDiagramID) },
        { projection: { legacyID: 1 } }
      );

    // replace version rootDiagramID with legacyID
    if (program) version.rootDiagramID = program.legacyID;

    return shallowObjectIdToString(version);
  };

  /** @deprecated legacy programID for alexa */
  private getLegacyProgram = async (legacyID: string) => {
    const program = await this.client.db
      .collection(this.programsCollection)
      .findOne<(P & { _id: ObjectId; versionID: ObjectId }) | null>({ legacyID });

    if (!program) throw new Error(`Program not found: ${legacyID}`);

    return shallowObjectIdToString(program);
  };
}

export default MongoDataAPI;
