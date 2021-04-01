import { State } from '@voiceflow/runtime';

export { default as MongoSession } from './mongo';
export { default as LocalSession } from './local';

export interface Session {
  saveToDb(projectID: string, userID: string, state: State): Promise<void>;

  getFromDb<T extends Record<string, any> = Record<string, any>>(projectID: string, userID: string): Promise<T>;

  deleteFromDb(projectID: string, userID: string): Promise<void>;
}
