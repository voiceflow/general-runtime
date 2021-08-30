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

  async saveToDb(projectID: string, userID: string, state: State) {
    const { mongo } = this.services;

    const id = this.getSessionID(projectID, userID);

    const {
      result: { ok },
    } = await mongo!.db
      .collection(this.collectionName)
      .updateOne({ id }, { $set: { id, projectID: new ObjectId(projectID), attributes: state } }, { upsert: true });

    if (!ok) {
      throw Error('store runtime session error');
    }
  }

  async getFromDb<T extends Record<string, any> = Record<string, any>>(projectID: string, userID: string) {
    const { mongo } = this.services;

    const id = this.getSessionID(projectID, userID);

    const session = await mongo!.db.collection(this.collectionName).findOne<{ attributes?: T }>({ id });

    return (session?.attributes || {}) as T;
  }

  async deleteFromDb(projectID: string, userID: string) {
    const { mongo } = this.services;
    const id = this.getSessionID(projectID, userID);

    const {
      deletedCount,
      result: { ok },
    } = await mongo!.db.collection(this.collectionName).deleteOne({ id });

    if (!ok || deletedCount !== 1) {
      throw Error('delete runtime session error');
    }
  }
}

export default SessionManager;
