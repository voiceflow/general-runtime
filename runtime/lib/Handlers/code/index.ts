import { Node } from '@voiceflow/general-types/build/nodes/code';
import axios from 'axios';
import _ from 'lodash';
import safeJSONStringify from 'safe-json-stringify';

import { HandlerFactory } from '@/runtime/lib/Handler';

import { vmExecute } from './utils';

export type CodeOptions = {
  endpoint?: string | null;
  callbacks?: Record<string, Function>;
  safe?: boolean;
};

const CodeHandler: HandlerFactory<Node, CodeOptions | void> = ({ endpoint, callbacks, safe } = {}) => ({
  canHandle: (node) => !!node.code,
  handle: async (node, runtime, variables) => {
    try {
      const variablesState = variables.getState();

      const reqData = {
        code: node.code,
        variables: variablesState,
      };

      const data = endpoint ? (await axios.post(endpoint, reqData)).data : vmExecute(reqData, safe, callbacks);

      // debugging changes find variable value differences
      const changes = _.union(Object.keys(variablesState), Object.keys(data)).reduce<string>((acc, variable) => {
        if (!_.isEqual(variablesState[variable], data[variable])) {
          acc += `\`{${variable}}\`: \`${JSON.stringify(variablesState[variable])}\` => \`${JSON.stringify(data[variable])}\`  \n`;
        }

        return acc;
      }, '');

      runtime.trace.debug(`evaluating code - ${changes ? `changes:  \n${changes}` : 'no variable changes'}`);

      variables.merge(data);

      return node.success_id ?? null;
    } catch (error) {
      runtime.trace.debug(`unable to resolve code  \n\`${safeJSONStringify(error.response?.data || error.toString())}\``);

      return node.fail_id ?? null;
    }
  },
});

export default CodeHandler;
