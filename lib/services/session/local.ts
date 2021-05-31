import { State } from '@/runtime';

import { AbstractManager } from '../utils';

class SessionManager extends AbstractManager {
  public table: Record<string, any> = {};

  private getSessionID(projectID: string, userID: string) {
    return `${projectID}.${userID}`;
  }

  async saveToDb(projectID: string, userID: string, state: State) {
    this.table[this.getSessionID(projectID, userID)] = state;
  }

  async getFromDb<T extends Record<string, any> = Record<string, any>>(projectID: string, userID: string) {
    return (this.table[this.getSessionID(projectID, userID)] || {}) as T;
  }

  async deleteFromDb(projectID: string, userID: string) {
    delete this.table[this.getSessionID(projectID, userID)];
  }
}

export default SessionManager;
