import { State } from '@voiceflow/runtime';

import { AbstractManager } from '../utils';

class SessionManager extends AbstractManager {
  public table: Record<string, any> = {};

  async saveToDb(userId: string, state: State) {
    this.table[userId] = state;
  }

  async getFromDb<T extends Record<string, any> = Record<string, any>>(userId: string) {
    return (this.table[userId] || {}) as T;
  }

  async deleteFromDb(userId: string) {
    delete this.table[userId];
  }
}

export default SessionManager;
