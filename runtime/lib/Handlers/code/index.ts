import { Node } from '@voiceflow/base-types';
import axios from 'axios';
import _ from 'lodash';
import safeJSONStringify from 'safe-json-stringify';

import { HandlerFactory } from '@/runtime/lib/Handler';

import { getUndefinedKeys, ivmExecute, vmExecute } from './utils';

export type CodeOptions = {
  endpoint?: string | null;
  callbacks?: Record<string, (...args: any) => any>;
  useStrictVM?: boolean;
  testingEnv?: boolean;
};

const CodeHandler: HandlerFactory<Node.Code.Node, CodeOptions | void> = ({ endpoint, callbacks, useStrictVM = false, testingEnv = false } = {}) => ({
  canHandle: (node) => !!node.code,
  handle: async (node, runtime, variables) => {
    try {
      const variablesState = variables.getState();

      const reqData = {
        code: node.code,
        variables: variablesState,
      };

      let newVariableState: Record<string, any>;
      // useStrictVM used for IfV2 and SetV2 to use isolated-vm
      if (useStrictVM) {
        newVariableState = await ivmExecute(reqData, callbacks);
      } else if (endpoint) {
        // pass undefined keys explicitly because they are not sent via http JSON
        newVariableState = (await axios.post(endpoint, { ...reqData, keys: getUndefinedKeys(reqData.variables) })).data;
      } else {
        // execute locally
        newVariableState = vmExecute(reqData, testingEnv, callbacks);
      }

      // debugging changes find variable value differences
      const changes = _.union(Object.keys(variablesState), Object.keys(newVariableState)).reduce<string>((acc, variable) => {
        if (!_.isEqual(variablesState[variable], newVariableState[variable])) {
          acc += `\`{${variable}}\`: \`${JSON.stringify(variablesState[variable])}\` => \`${JSON.stringify(newVariableState[variable])}\`  \n`;
        }

        return acc;
      }, '');

      runtime.trace.debug(`evaluating code - ${changes ? `changes:  \n${changes}` : 'no variable changes'}`, Node.NodeType.CODE);

      variables.merge(newVariableState);

      return node.success_id ?? null;
    } catch (error) {
      runtime.trace.debug(`unable to resolve code  \n\`${safeJSONStringify(error.response?.data || error.toString())}\``, Node.NodeType.CODE);

      return node.fail_id ?? null;
    }
  },
});

export default CodeHandler;
