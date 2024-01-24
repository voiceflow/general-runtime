import { NotFoundException } from '@voiceflow/exception';
import { ObjectId } from 'mongodb';

import { State } from '@/runtime';
import { Config } from '@/types';

import { AbstractManager } from '../utils';
import type { Session } from '.';
import { Source } from './constants';

class SessionManager extends AbstractManager implements Session {
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

    const { acknowledged } = await mongo!.db.collection(this.collectionName).updateOne(
      { projectID, id },
      {
        $set: { id, projectID, attributes: state },
      },
      { upsert: true }
    );

    if (!acknowledged) {
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

    const { acknowledged } = await mongo!.db.collection(this.collectionName).deleteOne({ projectID, id });

    if (!acknowledged) {
      throw Error('delete runtime session error');
    }
  }

  async updateVariables(_projectID: string, userID: string, variables: Record<string, any>): Promise<State> {
    const projectID = new ObjectId(_projectID);
    const { mongo } = this.services;

    const id = this.getSessionID(_projectID, userID);

    const variableSet = Object.fromEntries(
      Object.entries(variables).map(([key, value]) => [
        // replace special characters
        `attributes.variables.${key.replace(/[$()*+.?[\\\]^{|}]/g, '\\$&')}`,
        value,
      ])
    );

    const state = await mongo!.db.collection<State>(this.collectionName).findOneAndUpdate(
      { projectID, id },
      { $set: { id, projectID, ...variableSet } },
      {
        upsert: true,
        returnDocument: 'after',
      }
    );
    if (!state) throw new NotFoundException(`Project not found: ${projectID}`);
    return state;
  }
}

export default SessionManager;
