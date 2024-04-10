import { State } from '@/runtime';

export { default as LocalSession } from './local';
export { default as MongoSession } from './mongo';

export interface Session {
  saveToDb(projectID: string, userID: string, state: State): Promise<void>;

  getFromDb<T extends Record<string, any> = Record<string, any>>(
    projectID: string,
    userID: string
  ): Promise<T>;

  deleteFromDb(projectID: string, userID: string): Promise<void>;

  updateVariables(
    projectID: string,
    userID: string,
    variables?: Record<string, unknown>
  ): Promise<State>;
}
