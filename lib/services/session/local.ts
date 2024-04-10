import { State } from '@/runtime';

import { AbstractManager } from '../utils';
import type { Session } from '.';

class SessionManager extends AbstractManager implements Session {
  public table: Record<string, any> = {};

  private getSessionID(projectID: string, userID: string) {
    return `${projectID}.${userID}`;
  }

  async saveToDb(projectID: string, userID: string, state: State) {
    this.table[this.getSessionID(projectID, userID)] = state;
  }

  async getFromDb<T extends Record<string, any> = Record<string, any>>(
    projectID: string,
    userID: string
  ) {
    return (this.table[this.getSessionID(projectID, userID)] || {}) as T;
  }

  async deleteFromDb(projectID: string, userID: string) {
    delete this.table[this.getSessionID(projectID, userID)];
  }

  async updateVariables(projectID: string, userID: string, variables: Record<string, any>) {
    const state = await this.getFromDb<State>(projectID, userID);

    const newState = {
      ...state,
      variables: { ...state.variables, ...variables },
    };

    await this.saveToDb(projectID, userID, newState);

    return newState;
  }
}

export default SessionManager;
