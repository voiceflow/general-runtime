import { ObjectId } from 'mongodb';

import { State } from '@/runtime';
import { Config } from '@/types';

import { AbstractManager } from '../utils';
import { Source } from './constants';

class SessionManager extends AbstractManager {
  static GENERAL_SESSIONS_MONGO_PREFIX = 'general-platform.session';

  private collectionName = 'runtime-sessions';

  public static enabled(config: Config) {
    return config.SESSIONS_SOURCE === Source.MONGO;
  }

  private getSessionID(projectID: string, userID: string) {
    return `${SessionManager.GENERAL_SESSIONS_MONGO_PREFIX}.${projectID}.${userID}`;
  }

  async saveToDb(_projectID: string, userID: string, state: State) {
    const projectID = new ObjectId(_projectID);
    const { mongo } = this.services;

    const id = this.getSessionID(_projectID, userID);

    const {
      result: { ok },
    } = await mongo!.db
      .collection(this.collectionName)
      .updateOne({ projectID, id }, { $set: { id, projectID, attributes: state } }, { upsert: true });

    if (!ok) {
      throw Error('store runtime session error');
    }
  }

  async getFromDb<T extends Record<string, any> = Record<string, any>>(_projectID: string, userID: string) {
    const projectID = new ObjectId(_projectID);
    const { mongo } = this.services;

    const id = this.getSessionID(_projectID, userID);

    const session = await mongo!.db.collection(this.collectionName).findOne<{ attributes?: T }>({ projectID, id });

    return (session?.attributes || {}) as T;
  }

  async deleteFromDb(_projectID: string, userID: string) {
    const projectID = new ObjectId(_projectID);
    const { mongo } = this.services;

    const id = this.getSessionID(_projectID, userID);

    const {
      deletedCount,
      result: { ok },
    } = await mongo!.db.collection(this.collectionName).deleteOne({ projectID, id });

    if (!ok || deletedCount !== 1) {
      throw Error('delete runtime session error');
    }
  }
}

export default SessionManager;
