import { deepVariableSubstitution } from '@voiceflow/common';
import { IntegrationType, NodeType } from '@voiceflow/general-types';
import { Node } from '@voiceflow/general-types/build/nodes/integration';
import axios from 'axios';
import _ from 'lodash';
import safeJSONStringify from 'safe-json-stringify';

import { HandlerFactory } from '@/runtime/lib/Handler';

import { APINodeData, makeAPICall } from './utils';

export type IntegrationsOptions = {
  customAPIEndpoint?: string | null;
};

const APIHandler: HandlerFactory<Node, IntegrationsOptions | void> = ({ customAPIEndpoint } = {}) => ({
  canHandle: (node) => node.type === NodeType.INTEGRATIONS && node.selected_integration === IntegrationType.CUSTOM_API,
  handle: async (node, runtime, variables) => {
    let nextId: string | null = null;

    try {
      const actionBodyData = deepVariableSubstitution(_.cloneDeep(node.action_data), variables.getState()) as APINodeData;

      const data = customAPIEndpoint
        ? (await axios.post(`${customAPIEndpoint}/custom/make_api_call`, actionBodyData)).data
        : // make the call locally if no service
          await makeAPICall(actionBodyData);

      // add mapped variables to variables store
      variables.merge(data.variables);

      // if custom api returned error http status nextId to fail port, otherwise success
      if (data.response.status >= 400) {
        runtime.trace.debug(`API call returned status code ${data.response.status}`);
        nextId = node.fail_id ?? null;
      } else {
        runtime.trace.debug('API call successfully triggered');
        nextId = node.success_id ?? null;
      }
    } catch (error) {
      runtime.trace.debug(`API call failed - Error: \n${safeJSONStringify(error.response?.data || error)}`);
      nextId = node.fail_id ?? null;
    }

    return nextId;
  },
});

export default APIHandler;
