import { BaseNode } from '@voiceflow/base-types';
import safeJSONStringify from 'json-stringify-safe';

import Handler from '../../Handler';
import { FunctionHandlerConfig } from './functionHandler.interface';
import { PathCode } from './functionHandler.types';
import { Sandbox } from './sandbox/sandbox';
import { SandboxOptions } from './sandbox/sandbox.interface';

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

function formatError(errorMessage: string, sandboxOptions: SandboxOptions) {
  if (errorMessage.includes('Error: Script execution timed out.')) {
    return 'Error: Script execution exceeded timeout. Ensure that the script does not perform long-running computations or high latency network requests.';
  }

  if (errorMessage.includes('Error: Isolate was disposed during execution due to memory limit')) {
    return 'Error: Script execution exhausted available memory. Ensure that the script does not make expensive memory allocations.';
  }

  if (errorMessage.includes('Error: Network timeout at:')) {
    const timeoutS = Math.floor(sandboxOptions.fetchTimeoutMS / 1000);
    return `Error: Network request in Function code exceeded timeout of ${timeoutS} seconds. Ensure that the script does not perform a high latency network request.`;
  }

  if (errorMessage.includes('Error: content size at')) {
    const fetchMaxResponseSizeMB = Math.floor(sandboxOptions.fetchMaxResponseSizeBytes / 1e6);
    return `Error: Network request in Function code exceeded content size of ${fetchMaxResponseSizeMB} MB. Ensure that the network response body does not exceed the memory limit.`;
  }

  return errorMessage;
}

export const FunctionHandler = (config: FunctionHandlerConfig): Handler<BaseNode.Code.Node> => ({
  canHandle: (node) => node.type === BaseNode.NodeType.CODE,
  handle: async (node, runtime, variables) => {
    // $TODO$ - The resource limits should be passed in when invoking the runtime as some kind of execution
    // config object. The caller of the runtime (or one of its callers) is responsible for retrieving the
    // resource limits associated with a given plan, e.g, a starter use has 2s timeout on `fetch` whereas
    // an enterprise user has 10s timeout.
    const resourceLimits = {
      fetchTimeoutMS: 2 * 1000,
      fetchMaxResponseSizeBytes: 1e6,
      sandboxMemLimitMB: 8,
      sandboxTimeoutSec: 5,
    };

    const sandboxConfig: SandboxOptions = {
      shouldEnableInject: config.shouldInjectLog,
      ...resourceLimits,
    };

    try {
      const variableState = variables.getState();

      const { port, output: rawOutput } = await Sandbox.execute(node.code, variableState, sandboxConfig);

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
      const formattedError = formatError(stringifiedError, sandboxConfig);

      runtime.trace.debug(`unable to resolve code  \n\`${formattedError}\``, BaseNode.NodeType.CODE);

      return node.fail_id ?? null;
    }
  },
});
