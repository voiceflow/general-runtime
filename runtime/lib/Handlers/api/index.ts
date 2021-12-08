import { Node } from '@voiceflow/base-types';
import { deepVariableSubstitution } from '@voiceflow/common';
import _ from 'lodash';
import safeJSONStringify from 'safe-json-stringify';

import { HandlerFactory } from '@/runtime/lib/Handler';

import { APINodeData, makeAPICall } from './utils';

export type IntegrationsOptions = {
  customAPIEndpoint?: string | null;
};

export const USER_AGENT_KEY = 'User-Agent';
export const USER_AGENT = 'Voiceflow/1.0.0 (+https://voiceflow.com)';
const APIHandler: HandlerFactory<Node.Integration.Node, IntegrationsOptions | void> = () => ({
  canHandle: (node) => node.type === Node.NodeType.INTEGRATIONS && node.selected_integration === Node.Utils.IntegrationType.CUSTOM_API,
  handle: async (node, runtime, variables) => {
    let nextId: string | null = null;
    try {
      const actionBodyData = deepVariableSubstitution(_.cloneDeep(node.action_data), variables.getState()) as APINodeData;

      // override user agent
      const headers = actionBodyData.headers || [];
      if (!headers.some(({ key }) => key === USER_AGENT_KEY)) {
        actionBodyData.headers = [...headers, { key: USER_AGENT_KEY, val: USER_AGENT }];
      }

      const data = await makeAPICall(actionBodyData, runtime);

      // add mapped variables to variables store
      variables.merge(data.variables);

      // if custom api returned error http status nextId to fail port, otherwise success
      if (data.response.status >= 400) {
        runtime.trace.debug(`API call returned status code ${data.response.status}`, Node.NodeType.API);
        nextId = node.fail_id ?? null;
      } else {
        runtime.trace.debug('API call successfully triggered', Node.NodeType.API);
        nextId = node.success_id ?? null;
      }
    } catch (error) {
      runtime.trace.debug(`API call failed - Error: \n${safeJSONStringify(error.response?.data || error)}`, Node.NodeType.API);
      nextId = node.fail_id ?? null;
    }

    return nextId;
  },
});

export default APIHandler;
