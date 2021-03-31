import { State } from '@voiceflow/runtime';

export { default as MongoSession } from './mongo';
export { default as LocalSession } from './local';

export interface Session {
  saveToDb(userId: string, state: State): Promise<void>;

  getFromDb<T extends Record<string, any> = Record<string, any>>(userId: string): Promise<T>;

  deleteFromDb(userId: string): Promise<void>;
}
