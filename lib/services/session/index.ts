import { State } from '@voiceflow/runtime';

export { default as MongoSession } from './mongo';
export { default as LocalSession } from './local';

export interface Session {
  saveToDb(versionID: string, userId: string, state: State): Promise<void>;

  getFromDb<T extends Record<string, any> = Record<string, any>>(versionID: string, userId: string): Promise<T>;

  deleteFromDb(versionID: string, userId: string): Promise<void>;
}
