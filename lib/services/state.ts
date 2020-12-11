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

    return {
      stack: prototype?.context.stack || [
        {
          programID: rootDiagramID,
        },
      ],
      variables: {
        ..._.mapValues(prototype?.model.slots, 0),
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
