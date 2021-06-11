import { Version } from '@voiceflow/api-sdk';
import { GeneralTrace } from '@voiceflow/general-types';
import _ from 'lodash';

import { PartialContext, State } from '@/runtime';
import { Context, InitContextHandler } from '@/types';

import { AbstractManager, injectServices } from '../utils';
import CacheDataAPI from './cacheDataAPI';

export const utils = {};

const initializeStore = (variables: string[], defaultValue = 0) =>
  variables.reduce<Record<string, any>>((acc, variable) => {
    acc[variable] = defaultValue;
    return acc;
  }, {});

@injectServices({ utils })
class StateManager extends AbstractManager<{ utils: typeof utils }> implements InitContextHandler {
  /**
   * generate a context for a new session
   * @param versionID - project version to generate the context for
   */
  generate({ prototype, rootDiagramID }: Version<any>, state?: State): State {
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
        ...prototype?.context.variables,
        ...state?.variables,
      },
      storage: {
        ...prototype?.context.storage,
        ...state?.storage,
      },
    };
  }

  // initialize all entities and variables to 0, it is important that they are defined
  initializeVariables({ prototype, variables }: Version<any>, state: State) {
    const entities = prototype?.model.slots.map(({ name }) => name) || [];

    return {
      ...state,
      variables: {
        ...initializeStore(entities),
        ...initializeStore(variables),
        ...state.variables,
      },
    };
  }

  async handle(context: PartialContext<Context>) {
    if (!context.versionID) {
      throw new Error('context versionID not defined');
    }

    // cache per interaction (save version call during request/response cycle)
    const dataApi = await this.services.dataAPI.get(context.data?.reqHeaders?.authorization);
    const api = new CacheDataAPI(dataApi);
    const version = await api.getVersion(context.versionID!);

    const locale = context.data?.locale || version.prototype?.data?.locales?.[0];

    let { state } = context;

    // if stack or state is empty, repopulate the stack
    if (!state?.stack?.length) {
      state = this.generate(version, state);
    }
    console.log('identify');
    this.services.analyticsClient!.identify(context.versionID);

    return {
      ...context,
      state: this.initializeVariables(version, state),
      trace: [] as GeneralTrace[],
      request: context.request || null,
      versionID: context.versionID,
      data: { ...context.data, locale, api },
    };
  }
}

export default StateManager;
