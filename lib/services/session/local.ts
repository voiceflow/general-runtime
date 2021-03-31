import { State } from '@voiceflow/runtime';

import { AbstractManager } from '../utils';

class SessionManager extends AbstractManager {
  public table: Record<string, any> = {};

  private getSessionID(versionID: string, userID: string) {
    return `${versionID}.${userID}`;
  }

  async saveToDb(versionID: string, userID: string, state: State) {
    this.table[this.getSessionID(versionID, userID)] = state;
  }

  async getFromDb<T extends Record<string, any> = Record<string, any>>(versionID: string, userID: string) {
    return (this.table[this.getSessionID(versionID, userID)] || {}) as T;
  }

  async deleteFromDb(versionID: string, userID: string) {
    delete this.table[this.getSessionID(versionID, userID)];
  }
}

export default SessionManager;
