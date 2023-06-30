import { BaseNode } from '@voiceflow/base-types';
import safeJSONStringify from 'json-stringify-safe';

import Handler from '../../Handler';
import { FunctionHandlerConfig } from './functionHandler.interface';
import { PathCode } from './functionHandler.types';
import { Sandbox } from './sandbox/sandbox';

function sanitizeOutput(output: unknown) {
  if (typeof output !== 'object') return {};
  if (output === null) return {};
  return output;
}

function diffChanges(oldVariableState: Record<string, any>, updatePatch: Record<string, any>) {
  // The changes (a diff) that the execution of this code made to the variables
  const updatedKeys = Object.keys(updatePatch);
  const updateKeysSet = new Set(updatedKeys);
  const changes: Array<[string, { before: any; after: any }]> = Object.entries(oldVariableState)
    .filter(([key, _]) => updateKeysSet.has(key))
    .map(([key, oldValue]) => [
      key,
      {
        before: oldValue,
        after: updatePatch[key],
      },
    ]);

  return changes
    .map(
      ([variable, change]) =>
        `\`{${variable}}\`: \`${JSON.stringify(change.before)}\` => \`${JSON.stringify(change.after)}\``
    )
    .join('\n');
}

export const FunctionHandler = (config: FunctionHandlerConfig): Handler<BaseNode.Code.Node> => ({
  canHandle: (node) => node.type === BaseNode.NodeType.CODE,
  handle: async (node, runtime, variables) => {
    try {
      const variableState = variables.getState();

      const { port, output: rawOutput } = await Sandbox.execute(node.code, variableState, {
        shouldEnableInject: config.shouldInjectLog,
      });

      const output = sanitizeOutput(rawOutput);

      const changesSummary = diffChanges(variableState, output);

      runtime.trace.debug(
        // eslint-disable-next-line sonarjs/no-nested-template-literals
        `evaluating code - ${changesSummary ? `changes:\n${changesSummary}` : 'no variable changes'}`,
        BaseNode.NodeType.CODE
      );

      variables.merge(output);

      if (port === PathCode.Failure) {
        return node.fail_id ?? null;
      }

      if (port) {
        const nextPath = (node.paths ?? []).find((path) => path.label === port);
        if (nextPath) {
          return nextPath.nextId ?? null;
        }
      }

      return node.success_id ?? null;
    } catch (error) {
      const serializedError = error.response?.data || error.toString();
      const stringifiedError = safeJSONStringify(serializedError).replace('isolated-vm', 'sandbox');

      runtime.trace.debug(`unable to resolve code  \n\`${stringifiedError}\``, BaseNode.NodeType.CODE);

      return node.fail_id ?? null;
    }
  },
});
