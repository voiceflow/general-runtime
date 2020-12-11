import { State } from '@voiceflow/runtime';
import _ from 'lodash';

import { AbstractManager, injectServices } from './utils';

export const utils = {};

@injectServices({ utils })
class StateManager extends AbstractManager<{ utils: typeof utils }> {
  /**
   * generate a context for a new session
   * @param versionID - project version to generate the context for
   */
  async generate(versionID: string): Promise<State> {
    const { prototype, variables, rootDiagramID } = await this.services.dataAPI.getVersion(versionID);

    const entities = prototype?.model.slots.map(({ name }) => name);

    const DEFAULT_STACK = [{ programID: rootDiagramID, storage: {}, variables: {} }];

    const stack =
      prototype?.context.stack?.map((frame) => ({
        ...frame,
        storage: frame.storage || {},
        variables: frame.variables || {},
      })) || DEFAULT_STACK;

    return {
      stack,
      variables: {
        // initialize all entities and variables to 0
        ..._.mapValues(entities, 0),
        ..._.mapValues(variables, 0),
        ...prototype?.context.variables,
      },
      storage: {
        ...prototype?.context.storage,
      },
    };
  }
}

export default StateManager;
