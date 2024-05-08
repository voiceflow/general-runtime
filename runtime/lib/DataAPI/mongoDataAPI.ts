import { BaseModels } from '@voiceflow/base-types';
import { AnyRecord } from 'dns';
import { Db, ObjectId } from 'mongodb';

import { VersionTag } from '@/types';

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

  public getVersion = async (versionID: string, projection?: any): Promise<V> => {
    if (!isValidObjectID(versionID)) return this.getLegacyVersion(versionID);

    const version = await this.client.db
      .collection(this.versionsCollection)
      .findOne<(V & { _id: ObjectId; projectID: ObjectId }) | null>({ _id: new ObjectId(versionID) }, { projection });

    if (!version) throw new Error(`Version not found: ${versionID}`);

    return shallowObjectIdToString(version);
  };

  public getVersionPublishing = async (versionID: string): Promise<V['platformData']['publishing']> => {
    const version = await this.client.db.collection(this.versionsCollection).findOne(
      { _id: new ObjectId(versionID) },
      {
        projection: {
          'platformData.publishing': 1,
        },
      }
    );

    if (!version) throw new Error(`Version not found: ${versionID}`);

    return version.platformData?.publishing ?? {};
  };

  public getKBDocuments = async (
    projectID: string,
    documentIDs: string[]
  ): Promise<Record<string, BaseModels.Project.KnowledgeBaseDocument | null>> => {
    const project = await this.client.db.collection(this.projectsCollection).findOne<PJ>(
      {
        _id: new ObjectId(projectID),
      },
      {
        projection: Object.fromEntries(documentIDs.map((documentID) => [`knowledgeBase.documents.${documentID}`, 1])),
      }
    );

    return project?.knowledgeBase?.documents || {};
  };

  public hasKBDocuments = async (projectID: string): Promise<boolean> => {
    // more than 1 property in the object
    const result = await this.client.db
      .collection(this.projectsCollection)
      .aggregate([
        {
          $match: {
            _id: new ObjectId(projectID),
          },
        },
        {
          $project: {
            hasDocuments: {
              $gt: [
                {
                  $size: {
                    $objectToArray: {
                      $ifNull: ['$knowledgeBase.documents', {}], // Provide an empty object as default
                    },
                  },
                },
                0,
              ],
            },
          },
        },
      ])
      .next();

    return !!result?.hasDocuments;
  };

  public getProject = async (projectIDOrAuth: string) => {
    if (!isValidObjectID(projectIDOrAuth)) {
      return this.getProjectByAPIKey(projectIDOrAuth);
    }

    const project = await this.client.db
      .collection(this.projectsCollection)
      .findOne<(PJ & { _id: ObjectId; devVersion: ObjectId; liveVersion: ObjectId }) | null>(
        {
          _id: new ObjectId(projectIDOrAuth),
        },
        {
          projection: {
            'knowledgeBase.documents': 0,
          },
        }
      );

    if (!project) throw new Error(`Project not found: ${projectIDOrAuth}`);

    return shallowObjectIdToString(project);
  };

  public getProjectVersionIDByTag = async (projectID: string, tag: VersionTag) => {
    const project = await this.client.db
      .collection(this.projectsCollection)
      .findOne<{ _id: ObjectId; devVersion: ObjectId; liveVersion: ObjectId } | null>(
        {
          _id: new ObjectId(projectID),
        },
        {
          projection: {
            liveVersion: 1,
            devVersion: 1,
          },
        }
      );

    if (!project) return undefined;

    switch (tag) {
      case VersionTag.PRODUCTION:
        return project.liveVersion.toHexString();
      case VersionTag.DEVELOPMENT:
      default:
        return project.devVersion.toHexString();
    }
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
      .findOne<(PJ & { _id: ObjectId; devVersion: ObjectId; liveVersion: ObjectId }) | null>(
        {
          _id: new ObjectId(apiKey.projectID),
        },
        {
          projection: {
            'knowledgeBase.documents': 0,
          },
        }
      );

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
