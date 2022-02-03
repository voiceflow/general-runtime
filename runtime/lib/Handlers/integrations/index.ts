import { BaseNode } from '@voiceflow/base-types';
import { deepVariableSubstitution } from '@voiceflow/common';
import axios from 'axios';
import _ from 'lodash';
import safeJSONStringify from 'safe-json-stringify';

import { HandlerFactory } from '@/runtime/lib/Handler';

import { ENDPOINTS_MAP, resultMappings } from './utils';

export type IntegrationsOptions = {
  integrationsEndpoint: string;
};

const VALID_INTEGRATIONS = [BaseNode.Utils.IntegrationType.ZAPIER, BaseNode.Utils.IntegrationType.GOOGLE_SHEETS];

const IntegrationsHandler: HandlerFactory<BaseNode.Integration.Node, IntegrationsOptions> = ({ integrationsEndpoint }) => ({
  canHandle: (node) => node.type === BaseNode.NodeType.INTEGRATIONS && VALID_INTEGRATIONS.includes(node.selected_integration),
  handle: async (node, runtime, variables) => {
    if (!node.selected_integration || !node.selected_action) {
      runtime.trace.debug('no integration or action specified - fail by default', BaseNode.NodeType.INTEGRATIONS);
      return node.fail_id ?? null;
    }

    let nextId: string | null = null;

    try {
      const { selected_action: selectedAction, selected_integration: selectedIntegration } = node;

      const actionBodyData = deepVariableSubstitution(_.cloneDeep(node.action_data), variables.getState());

      const { data } = await axios.post(`${integrationsEndpoint}${ENDPOINTS_MAP[selectedIntegration][selectedAction]}`, actionBodyData);

      // map result data to variables
      const mappedVariables = resultMappings(node, data);
      // add mapped variables to variables store
      variables.merge(mappedVariables);

      runtime.trace.debug(
        `action **${node.selected_action}** for integration **${node.selected_integration}** successfully triggered`,
        BaseNode.NodeType.INTEGRATIONS
      );
      nextId = node.success_id ?? null;
    } catch (error) {
      runtime.trace.debug(
        `action **${node.selected_action}** for integration **${node.selected_integration}** failed  \n${safeJSONStringify(error.response?.data)}`,
        BaseNode.NodeType.INTEGRATIONS
      );
      nextId = node.fail_id ?? null;
    }

    return nextId;
  },
});

export default IntegrationsHandler;
