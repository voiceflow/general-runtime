import { BaseNode, RuntimeLogs } from '@voiceflow/base-types';
import { deepVariableSubstitution } from '@voiceflow/common';
import safeJSONStringify from 'json-stringify-safe';
import _cloneDeep from 'lodash/cloneDeep';

import Handler from '@/runtime/lib/Handler';

import DebugLogging, { SimpleStepMessage } from '../../Runtime/DebugLogging';
import { APIHandlerConfig } from './types';
import { APICallResult, APINodeData, makeAPICall } from './utils';

const createLogEntry = async (
  apiCallResult: APICallResult,
  nodeData: APINodeData,
  debugLogging: DebugLogging
): Promise<[message: SimpleStepMessage<RuntimeLogs.Logs.ApiStepLog>, level: RuntimeLogs.Logs.ApiStepLog['level']]> => {
  const isVerbose = debugLogging.shouldLog(RuntimeLogs.LogLevel.VERBOSE);
  const logLevelOnSuccess = isVerbose ? RuntimeLogs.LogLevel.VERBOSE : RuntimeLogs.LogLevel.INFO;

  const logLevel = apiCallResult.response.ok ? logLevelOnSuccess : RuntimeLogs.LogLevel.ERROR;
  const method = apiCallResult.request.method as BaseNode.Api.APIMethod;

  if (isVerbose) {
    return [
      {
        request: {
          url: apiCallResult.request.url,
          headers: Object.fromEntries(apiCallResult.request.headers.entries()),
          query: Object.fromEntries(new URL(apiCallResult.request.url).searchParams.entries()),
          ...(method === BaseNode.Api.APIMethod.GET
            ? {
                method,
                bodyType: null,
                body: null,
              }
            : {
                method,
                bodyType: nodeData.bodyInputType,
                body: await apiCallResult.request.text(),
              }),
        },
        response: {
          statusCode: apiCallResult.response.status,
          statusText: apiCallResult.response.statusText,
          body: JSON.stringify(apiCallResult.responseJSON),
          headers: apiCallResult.response.headers,
        },
      },
      logLevel,
    ];
  }

  return [
    {
      request: {
        url: apiCallResult.request.url,
        method,
        headers: null,
        query: null,
        bodyType: null,
        body: null,
      },
      response: {
        statusCode: apiCallResult.response.status,
        statusText: apiCallResult.response.statusText,
        headers: null,
        body: null,
      },
    },
    logLevel,
  ];
};

export const USER_AGENT_KEY = 'User-Agent';
export const USER_AGENT = 'Voiceflow/1.0.0 (+https://voiceflow.com)';
const APIHandler = (config: Partial<APIHandlerConfig>): Handler<BaseNode.Integration.Node> => ({
  canHandle: (node) =>
    node.type === BaseNode.NodeType.INTEGRATIONS &&
    node.selected_integration === BaseNode.Utils.IntegrationType.CUSTOM_API,
  handle: async (node, runtime, variables) => {
    let nextId: string | null = null;

    const actionBodyData = deepVariableSubstitution(_cloneDeep(node.action_data), variables.getState()) as APINodeData;

    // override user agent
    const headers = actionBodyData.headers || [];
    if (!headers.some(({ key }) => key === USER_AGENT_KEY)) {
      actionBodyData.headers = [...headers, { key: USER_AGENT_KEY, val: USER_AGENT }];
    }

    let data: APICallResult;

    try {
      data = await makeAPICall(actionBodyData, runtime, config);
    } catch (error) {
      runtime.trace.debug(
        `API call failed - Error: \n${safeJSONStringify(error?.message || error)}`,
        BaseNode.NodeType.API
      );
      nextId = node.fail_id ?? null;

      return nextId;
    }

    // add mapped variables to variables store
    variables.merge(data.variables);

    // if custom api returned error http status nextId to fail port, otherwise success
    if (data.response.ok) {
      runtime.trace.debug('API call successfully triggered', BaseNode.NodeType.API);

      nextId = node.success_id ?? null;
    } else {
      runtime.trace.debug(
        `API call error - \n${safeJSONStringify({ status: data.response.status, data: data.responseJSON })}`,
        BaseNode.NodeType.API
      );

      nextId = node.fail_id ?? null;
    }

    runtime.debugLogging.recordStepLog(
      RuntimeLogs.Kinds.StepLogKind.API,
      node,
      ...(await createLogEntry(data, actionBodyData, runtime.debugLogging))
    );

    return nextId;
  },
});

export default APIHandler;
