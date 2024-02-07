import { BaseModels, BaseRequest, BaseTrace } from '@voiceflow/base-types';
import { Variable, VariableDatatype } from '@voiceflow/dtos';
import axios from 'axios';
import _ from 'lodash';

import { FrameType } from '@/lib/services/runtime/types';
import { PartialContext, State } from '@/runtime';
import { builtInVariableTypes } from '@/runtime/lib/Runtime/utils/variables';
import { Context, InitContextHandler } from '@/types';

import { AbstractManager, injectServices } from '../utils';
import CacheDataAPI from './cacheDataAPI';

export const utils = {
  getTime: () => Math.floor(Date.now() / 1000),
};

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
  generate({ prototype, rootDiagramID }: BaseModels.Version.Model<any>, state?: State, userID?: string): State {
    const DEFAULT_STACK = [{ diagramID: rootDiagramID, storage: {}, variables: {} }];

    const stack =
      prototype?.context.stack?.map((frame) => ({
        ...frame,
        storage: frame.storage || {},
        variables: frame.variables || {},
      })) || DEFAULT_STACK;

    const variables = {
      ...prototype?.context.variables,
      ...state?.variables,
    };

    // new session default variables
    variables.sessions = (_.isNumber(variables.sessions) ? variables.sessions : 0) + 1;
    if (userID) variables.user_id = userID;

    return {
      stack,
      variables,
      storage: {
        ...prototype?.context.storage,
        ...state?.storage,
      },
    };
  }

  parseDefaultValue(variableName: string, declare: any) {
    const { defaultValue } = declare;

    let type = declare.datatype;

    if (declare.isSystem) {
      const builtInType = builtInVariableTypes.get(variableName);
      if (!builtInType) {
        throw new Error(`Received an invalid built-in variable with no defined type`);
      }
      type = builtInType;
    }

    switch (type) {
      case VariableDatatype.BOOLEAN:
        return defaultValue.toLowerCase() === 'true';
      case VariableDatatype.DATE:
        return new Date(defaultValue);
      case VariableDatatype.NUMBER:
        return parseFloat(defaultValue);
      case VariableDatatype.TEXT:
      case VariableDatatype.IMAGE:
      case VariableDatatype.ANY:
        return defaultValue;
      default:
        throw new Error(`Received unexpected variable type '${type}'`);
    }
  }

  initializeFromCMSVariables(variables: Record<string, any>) {
    return Object.entries(variables).reduce<Record<string, string | number | boolean | Date>>(
      (acc, [name, declare]) => ({
        ...acc,
        [name]: this.parseDefaultValue(name, declare) ?? 0,
      }),
      {}
    );
  }

  // initialize all entities and variables to 0, it is important that they are defined
  initializeVariables(version: BaseModels.Version.Model<any>, state: State) {
    const entities = version.prototype?.model.slots.map(({ name }) => name) || [];
    const variables: Record<string, Variable> = version.prototype?.surveyorContext.cmsVariables ?? {};

    return {
      ...state,
      variables: {
        ...initializeStore(entities),
        ...initializeStore(version.variables),
        ...this.initializeFromCMSVariables(variables),
        ...state.variables,
        timestamp: this.services.utils.getTime(), // unix time in seconds
      },
    };
  }

  async handle(context: PartialContext<Context>) {
    if (!context.versionID) {
      throw new Error('context versionID not defined');
    }

    if (context.request && BaseRequest.isLaunchRequest(context.request) && context.state) {
      context.state.stack = [];
      context.state.storage = {};
    }

    // sanitize incoming intents
    if (context.request && BaseRequest.isIntentRequest(context.request) && !context.request.payload.entities) {
      context.request.payload.entities = [];
    }

    // TODO: this is a hacky way to reset a session's stack after a version upgrade
    // reset the stack for user if base frameID is not the same as the current version, otherwise they will never update
    // this is for when the version is labelled as 'production' but can refer to an arbitrary versionID
    const baseFrame = context.state?.stack?.[0];
    if (baseFrame?.storage?.[FrameType.IS_BASE] && baseFrame.diagramID !== context.versionID) {
      context.state!.stack = [];
    }

    // cache per interaction (save version call during request/response cycle)
    const dataApi = await this.services.dataAPI.get();
    const api = new CacheDataAPI(dataApi);
    const version = await api.getVersion(context.versionID!);
    const project = await api.getProject(version.projectID);

    let plan: string | undefined;
    if (this.config.CREATOR_API_ENDPOINT) {
      const planResponse = await axios
        .get<{ plan: string } | null>(`${this.config.CREATOR_API_ENDPOINT}/private/project/${project._id}/plan`)
        .catch(() => null);
      plan = planResponse?.data?.plan ?? undefined;
    }

    const locale = context.data?.locale || version.prototype?.data?.locales?.[0];

    let { state } = context;

    // if stack or state is empty, repopulate the stack
    if (!state?.stack?.length) {
      state = this.generate(version, state, context.userID);
    }

    return {
      ...context,
      state: this.initializeVariables(version, state),
      trace: [] as BaseTrace.AnyTrace[],
      request: context.request || null,
      versionID: context.versionID,
      projectID: version.projectID,
      data: { ...context.data, locale, api },
      version,
      project,
      plan,
    };
  }
}

export default StateManager;
