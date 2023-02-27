import { BaseModels } from '@voiceflow/base-types';
import { AnyRecord } from 'dns';
import { Db, ObjectId } from 'mongodb';

import { DataAPI, Display } from './types';
import { extractAPIKeyID } from './utils';

class MongoDataAPI<
  P extends BaseModels.Program.Model<any, any>,
  V extends BaseModels.Version.Model<any>,
  PJ extends BaseModels.Project.Model<any, any> = BaseModels.Project.Model<AnyRecord, AnyRecord>
> implements DataAPI<P, V, PJ>
{
  protected client: Db;

  protected programsCollection = 'programs';

  protected versionsCollection = 'versions';

  constructor({ client }: { client: Db }) {
    this.client = client;
  }

  public fetchDisplayById = async (displayId: number): Promise<null | Display> => {
    const { data }: { data: undefined | null | Display } = await this.client.get(`/metadata/displays/${displayId}`);

    return data ?? null;
  };

  public getProgram = async (programID: string): Promise<P> => {
    const program = await this.client
      .collection(this.programsCollection)
      .findOne<(P & { _id: ObjectId; versionID: ObjectId }) | null>({ _id: new ObjectId(programID) });

    if (!program) throw new Error(`Program not found: ${programID}`);

    return {
      ...program,
      _id: program._id.toHexString(),
      versionID: program.versionID?.toHexString(),
    };
  };

  public getVersion = async (versionID: string): Promise<V> => {
    const version = await this.client
      .collection(this.versionsCollection)
      .findOne<(V & { _id: ObjectId; projectID: ObjectId }) | null>({ _id: new ObjectId(versionID) });

    if (!version) throw new Error(`Version not found: ${versionID}`);

    return {
      ...version,
      _id: version._id.toHexString(),
      projectID: version.projectID?.toHexString(),
    };
  };

  public getProject = async (projectID: string) => {
    const { data } = await this.client.get<PJ>(`/project/${projectID}`);

    return data;
  };

  public getProjectNLP = async (projectID: string) => {
    const { data } = await this.client.get<PJ>(`/project/${projectID}`);

    return {
      nlp: data.prototype?.nlp,
      devVersion: data.devVersion,
      liveVersion: data.liveVersion,
      platformData: data.platformData,
    };
  };

  public getProjectUsingAPIKey = async (key: string): Promise<PJ> => {
    const apiKeyID = extractAPIKeyID(key);

    const { data } = await this.client.get<PJ>(`/api-key/${apiKeyID}/project`);
    return data;
  };
}

export default MongoDataAPI;
