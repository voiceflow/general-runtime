import { BaseModels, BaseTrace } from '@voiceflow/base-types';
import { CompiledCMSVariable } from '@voiceflow/base-types/build/cjs/cms/variables';
import * as DTO from '@voiceflow/dtos';
import { parseCMSVariableDefaultValue } from '@voiceflow/utils-designer';
import axios from 'axios';
import _ from 'lodash';

import { BillingClient } from '@/lib/clients/billing-client';
import { FrameType } from '@/lib/services/runtime/types';
import { PartialContext, State, SubscriptionEntitlements } from '@/runtime';
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

const getSubscriptionEntitlements = async (billingClientFactory: BillingClient, workspaceID: string) => {
  const billingClient = await billingClientFactory.getClient();
  if (billingClient) {
    const subscriptionResponse = await billingClient.resourcesPrivate
      .getResourceSubscription('workspace', workspaceID)
      .catch(() => null);
    if (subscriptionResponse) {
      return !['active', 'in_trial'].includes(subscriptionResponse.subscription.status)
        ? []
        : subscriptionResponse.subscription?.subscription_entitlements;
    }
  }
  return undefined;
};

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

  initializeFromCMSVariables(variables: Record<string, any>) {
    return Object.fromEntries(
      Object.entries(variables).map(([name, declare]) => [name, parseCMSVariableDefaultValue(name, declare) ?? 0])
    );
  }

  // initialize all entities and variables to 0, it is important that they are defined
  initializeVariables(version: BaseModels.Version.Model<any>, state: State) {
    const entities = version.prototype?.model.slots.map(({ name }) => name) || [];
    const variables: Record<string, CompiledCMSVariable> = version.prototype?.surveyorContext.cmsVariables ?? {};

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

    if (context.request && DTO.isLaunchRequest(context.request) && context.state) {
      context.state.stack = [];
      context.state.storage = {};
    }

    // sanitize incoming intents
    if (context.request && DTO.isIntentRequest(context.request) && !context.request.payload.entities) {
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

    const subscriptionEntitlements: SubscriptionEntitlements | undefined = await getSubscriptionEntitlements(
      this.services.billingClient,
      project.teamID
    );

    // TODO remove once we drop teams table
    let plan: string | undefined;
    if (!subscriptionEntitlements && this.config.CREATOR_API_ENDPOINT) {
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
      subscriptionEntitlements,
    };
  }
}

export default StateManager;
