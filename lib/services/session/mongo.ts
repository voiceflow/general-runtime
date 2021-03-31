import { State } from '@voiceflow/runtime';

import { Config } from '@/types';

import { AbstractManager } from '../utils';
import { Source } from './constants';

class SessionManager extends AbstractManager {
  static GENERAL_SESSIONS_MONGO_PREFIX = 'general-platform.user';

  private collectionName = 'runtime-sessions';

  public static enabled(config: Config) {
    return config.SESSIONS_SOURCE === Source.MONGO;
  }

  private getSessionID(versionID: string, userID: string) {
    return `${versionID}.${userID}`;
  }

  async saveToDb(versionID: string, userID: string, state: State) {
    const { mongo } = this.services;

    const id = `${SessionManager.GENERAL_SESSIONS_MONGO_PREFIX}.${this.getSessionID(versionID, userID)}`;

    const {
      result: { ok },
    } = await mongo!.db.collection(this.collectionName).updateOne({ id }, { $set: { id, versionID, attributes: state } }, { upsert: true });

    if (!ok) {
      throw Error('store runtime session error');
    }
  }

  async getFromDb<T extends Record<string, any> = Record<string, any>>(versionID: string, userID: string) {
    const { mongo } = this.services;

    const id = `${SessionManager.GENERAL_SESSIONS_MONGO_PREFIX}.${this.getSessionID(versionID, userID)}`;

    const session = await mongo!.db.collection(this.collectionName).findOne<{ attributes: object }>({ id });

    return (session?.attributes || {}) as T;
  }

  async deleteFromDb(versionID: string, userID: string) {
    const { mongo } = this.services;
    const id = `${SessionManager.GENERAL_SESSIONS_MONGO_PREFIX}.${this.getSessionID(versionID, userID)}`;

    const {
      result: { ok },
    } = await mongo!.db.collection(this.collectionName).deleteOne({ id });

    if (!ok) {
      throw Error('delete runtime session error');
    }
  }
}

export default SessionManager;
