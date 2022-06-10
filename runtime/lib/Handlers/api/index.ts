import { BaseNode } from '@voiceflow/base-types';
import { deepVariableSubstitution } from '@voiceflow/common';
import safeJSONStringify from 'json-stringify-safe';
import _ from 'lodash';

import Handler from '@/runtime/lib/Handler';

import { APINodeData, makeAPICall, ResponseConfig } from './utils';

export const USER_AGENT_KEY = 'User-Agent';
export const USER_AGENT = 'Voiceflow/1.0.0 (+https://voiceflow.com)';
const APIHandler = (config: ResponseConfig = {}): Handler<BaseNode.Integration.Node> => ({
  canHandle: (node) =>
    node.type === BaseNode.NodeType.INTEGRATIONS &&
    node.selected_integration === BaseNode.Utils.IntegrationType.CUSTOM_API,
  handle: async (node, runtime, variables) => {
    let nextId: string | null = null;
    try {
      const actionBodyData = deepVariableSubstitution(
        _.cloneDeep(node.action_data),
        variables.getState()
      ) as APINodeData;

      // override user agent
      const headers = actionBodyData.headers || [];
      if (!headers.some(({ key }) => key === USER_AGENT_KEY)) {
        actionBodyData.headers = [...headers, { key: USER_AGENT_KEY, val: USER_AGENT }];
      }

      const data = await makeAPICall(actionBodyData, runtime, config);

      // add mapped variables to variables store
      variables.merge(data.variables);

      // if custom api returned error http status nextId to fail port, otherwise success
      if (data.response.status >= 400) {
        runtime.trace.debug(
          `API call error - \n${safeJSONStringify({ status: data.response.status, data: data.response.data })}`,
          BaseNode.NodeType.API
        );
        nextId = node.fail_id ?? null;
      } else {
        runtime.trace.debug('API call successfully triggered', BaseNode.NodeType.API);
        nextId = node.success_id ?? null;
      }
    } catch (error) {
      runtime.trace.debug(
        `API call failed - Error: \n${safeJSONStringify(error?.message || error)}`,
        BaseNode.NodeType.API
      );
      nextId = node.fail_id ?? null;
    }

    return nextId;
  },
});

export default APIHandler;