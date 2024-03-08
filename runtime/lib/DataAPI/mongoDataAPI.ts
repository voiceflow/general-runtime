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

export const isValidObjectID = (id: unknown) =>
  (typeof id === 'string' || id instanceof ObjectId) && ObjectId.isValid(id);

interface Client {
  db: Db;
}

// this is a test change, please delete
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

  protected apiKeyCollection = 'api-keys';

  constructor(client: Client) {
    this.client = client;
  }

  static isolateAPIKey(authorization: string) {
    if (authorization.startsWith('ApiKey ')) return authorization.replace('ApiKey ', '');
    if (authorization.startsWith('Bearer ')) return authorization.replace('Bearer ', '');
    return authorization;
  }

  public getProgram = async (versionID: string, diagramID: string): Promise<P> => {
    if (!isValidObjectID(diagramID)) return this.getLegacyProgram(diagramID);

    const program = await this.client.db
      .collection(this.programsCollection)
      .findOne<(P & { _id: ObjectId; versionID: ObjectId }) | null>({
        versionID: new ObjectId(versionID),
        diagramID: new ObjectId(diagramID),
      });

    if (!program) throw new Error(`Program not found: ${diagramID}`);

    return shallowObjectIdToString(program);
  };

  public getVersion = async (versionID: string): Promise<V> => {
    if (!isValidObjectID(versionID)) return this.getLegacyVersion(versionID);

    const version = await this.client.db
      .collection(this.versionsCollection)
      .findOne<(V & { _id: ObjectId; projectID: ObjectId }) | null>({ _id: new ObjectId(versionID) });

    if (!version) throw new Error(`Version not found: ${versionID}`);

    return shallowObjectIdToString(version);
  };

  public getProject = async (projectIDOrAuth: string) => {
    if (!isValidObjectID(projectIDOrAuth)) {
      return this.getProjectByAPIKey(projectIDOrAuth);
    }

    const project = await this.client.db
      .collection(this.projectsCollection)
      .findOne<(PJ & { _id: ObjectId; devVersion: ObjectId; liveVersion: ObjectId }) | null>({
        _id: new ObjectId(projectIDOrAuth),
      });

    if (!project) throw new Error(`Project not found: ${projectIDOrAuth}`);

    return shallowObjectIdToString(project);
  };

  public getProjectByAPIKey = async (auth: string) => {
    const [apiKeyID, apiKeyKey] = MongoDataAPI.isolateAPIKey(auth).replace('VF.', '').replace('DM.', '').split('.');

    const apiKey = await this.client.db
      .collection(this.apiKeyCollection)
      .findOne<{ projectID: string } | null>({ _id: new ObjectId(apiKeyID), key: apiKeyKey });

    if (!apiKey) {
      throw new Error(`Invalid api key: ${apiKey}`);
    }

    const project = await this.client.db
      .collection(this.projectsCollection)
      .findOne<(PJ & { _id: ObjectId; devVersion: ObjectId; liveVersion: ObjectId }) | null>({
        _id: new ObjectId(apiKey.projectID),
      });

    if (!project) throw new Error(`Project not found: ${apiKey}`);

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
        { _id: new ObjectId(version.rootDiagramID) },
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
