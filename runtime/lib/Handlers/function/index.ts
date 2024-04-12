import { BaseNode, BaseTrace, BaseVersion } from '@voiceflow/base-types';
import { BaseTraceFrame } from '@voiceflow/base-types/build/cjs/trace';
import { replaceVariables } from '@voiceflow/common';
import {
  FunctionCompiledData,
  FunctionCompiledDefinition,
  FunctionCompiledInvocation,
  FunctionCompiledNode,
  NodeType,
} from '@voiceflow/dtos';

import { TurnType } from '@/lib/services/runtime/types';
import { HandlerFactory } from '@/runtime/lib/Handler';
import _query from '@/utils/underscore-query';

import { InternalVariables } from '../../Constants/internal-variables';
import Runtime, { Action } from '../../Runtime';
import Store from '../../Runtime/Store';
import { executeFunction } from './lib/execute-function/execute-function';
import { createFunctionExceptionDebugTrace } from './lib/function-exception/function.exception';
import { NextBranches, NextBranchesDTO, NextCommand } from './runtime-command/next-command.dto';
import { OutputVarsCommand } from './runtime-command/output-vars-command.dto';
import { TraceCommand } from './runtime-command/trace-command.dto';
import { Transfer, TransferType } from './runtime-command/transfer/transfer.dto';

const utilsObj = {
  replaceVariables,
};

function applyOutputCommand(
  command: OutputVarsCommand,
  runtime: Runtime,
  {
    variables,
    outputVarDeclarations,
    outputVarAssignments,
  }: {
    variables: Store;
    outputVarDeclarations: FunctionCompiledDefinition['outputVars'];
    outputVarAssignments: FunctionCompiledInvocation['outputVars'];
  }
): void {
  Object.keys(outputVarDeclarations).forEach((functionVarName) => {
    const diagramVariableName = outputVarAssignments[functionVarName];
    if (!diagramVariableName) return;
    variables.set(diagramVariableName, command[functionVarName]);
    runtime.variables.set(diagramVariableName, command[functionVarName]);
  });
}

function applyTraceCommand(command: TraceCommand, runtime: Runtime): void {
  command.forEach((trace) => {
    // !TODO! - Revamp `general-runtime` types to allow users to modify the built-in
    //          trace types and avoid this `as` cast.
    runtime.trace.addTrace(trace as BaseTraceFrame);
  });
}

function applyNextCommand(
  command: NextCommand,
  runtime: Runtime,
  { nodeId, paths }: { nodeId: string; paths: FunctionCompiledInvocation['paths'] }
): string | null {
  if ('listen' in command) {
    if (!command.listen) return null;

    const { defaultTo, to } = command;
    runtime.storage.set(InternalVariables.FUNCTION_CONDITIONAL_TRANSFERS, { defaultTo, to });

    return nodeId;
  }
  if ('path' in command) {
    return paths[command.path] ?? null;
  }
  return null;
}

function resolveFunctionDefinition(
  definition: FunctionCompiledData['definition'],
  version: BaseVersion.Version
): FunctionCompiledDefinition {
  if ('functionId' in definition) {
    const functionDefinition = version.prototype?.surveyorContext.functionDefinitions;

    if (!functionDefinition) {
      throw new Error('prototype is missing function definitions');
    }

    const resolvedDefinition = functionDefinition[definition.functionId];
    if (!resolvedDefinition) {
      throw new Error(`unable to resolve function definition, the definition was not found`);
    }
    return resolvedDefinition;
  }

  return definition;
}
function applyTransfer(transfer: string | Transfer, paths: FunctionCompiledInvocation['paths']) {
  // Case 1 - `transfer` is a path string that must be mapped
  if (typeof transfer === 'string') {
    return paths[transfer];
  }

  // Case 2 - `transfer` is a Transfer object that can be anything such as a PathTransfer
  if (transfer.type === TransferType.PATH) {
    return paths[transfer.path];
  }

  throw new Error(`Function produced a transfer object with an unexpected type '${transfer.type}'`);
}

function handleListenResponse(
  conditionalTransfers: NextBranches,
  requestContext: FunctionRequestContext,
  paths: FunctionCompiledInvocation['paths']
): string {
  const firstMatchingTransfer = conditionalTransfers.to.find((item) => _query([requestContext], item.on).length > 0);

  if (!firstMatchingTransfer) {
    return applyTransfer(conditionalTransfers.defaultTo, paths);
  }

  return applyTransfer(firstMatchingTransfer.dest, paths);
}

const guidedNavigationEventPrefix = `_vf_internal_guided-navigation`;

const isGuidedNavigation = (runtime: Runtime): boolean =>
  runtime.version?._id === runtime.project?.devVersion && !!runtime.turn.get(TurnType.STOP_ALL);

const toGuidedNavigationEventType = (name: string): string => `${guidedNavigationEventPrefix}:${name}`;

const fromGuidedNavigationEventType = (name: string): string => name.replace(`${guidedNavigationEventPrefix}:`, '');

const isGuidedNavigationEventType = (name: string): boolean => name.startsWith(`${guidedNavigationEventPrefix}:`);

function injectGuidedNavigationButtons(runtime: Runtime, paths: FunctionCompiledDefinition['pathCodes']) {
  if (!isGuidedNavigation(runtime)) return;

  /**
   * User is running the development version through the Prototype Tool and has enabled
   * "Guided Navigation". Moreover, the user has not returned a `choice` trace.
   */
  if (runtime.turn.get(TurnType.STOP_ALL)) {
    const sortedPaths = paths.slice();
    sortedPaths.sort();

    runtime.trace.addTrace<BaseNode.Utils.BaseTraceFrame<unknown>>({
      type: '__vf_internal__function_guided_navigation__buttons__',
      payload: {},
      defaultPath: 0,
      paths: sortedPaths.map((path) => ({ label: path, event: { type: toGuidedNavigationEventType(path) } })),
    });
  }
}

function applyGuidedNavigationButton(
  { type }: { type: string; payload: string },
  paths: FunctionCompiledInvocation['paths']
) {
  if (isGuidedNavigationEventType(type)) {
    const pathName = fromGuidedNavigationEventType(type);
    return paths[pathName];
  }
  return null;
}

export interface FunctionRequestContext {
  event?: unknown;
}

export const FunctionHandler: HandlerFactory<FunctionCompiledNode, typeof utilsObj> = (utils) => ({
  canHandle: (node) => node.type === NodeType.FUNCTION,

  handle: async (node, runtime, variables): Promise<string | null> => {
    const { definition, invocation } = node.data;

    const resolvedDefinition = resolveFunctionDefinition(definition, runtime.version!);

    try {
      /**
       * Case 1 - If there are no `parsedTransfers`, then we are hitting this Function step for the
       *          first time
       */
      if (runtime.getAction() === Action.RUNNING) {
        const resolvedInputMapping = Object.entries(invocation.inputVars).reduce((acc, [varName, value]) => {
          return {
            ...acc,
            [varName]: utils.replaceVariables(value, variables.getState()),
          };
        }, {});

        const { next, outputVars, trace } = await executeFunction({
          ...node.data,
          definition: resolvedDefinition,
          source: {
            codeId: resolvedDefinition.codeId,
          },
          invocation: {
            inputVars: resolvedInputMapping,
          },
        });

        if (outputVars) {
          applyOutputCommand(outputVars, runtime, {
            variables,
            outputVarDeclarations: resolvedDefinition.outputVars,
            outputVarAssignments: invocation.outputVars,
          });
        }

        if (trace) {
          applyTraceCommand(trace, runtime);
        }

        injectGuidedNavigationButtons(runtime, resolvedDefinition.pathCodes);

        if (resolvedDefinition.pathCodes.length === 0) {
          return invocation.paths.__vf__default ?? null;
        }
        if (next) {
          return applyNextCommand(next, runtime, { nodeId: node.id, paths: invocation.paths });
        }
        return null;
      }

      /**
       * Case 2 - Guided navigation from the Prototype Tool. Instead of performing the listen's match
       *          logic, the user instead explicitly specifies the
       */
      if (isGuidedNavigation(runtime)) {
        runtime.storage.set(InternalVariables.FUNCTION_CONDITIONAL_TRANSFERS, null);

        return applyGuidedNavigationButton(runtime.getRequest(), invocation.paths);
      }

      const parsedTransfers = NextBranchesDTO.safeParse(
        runtime.storage.get(InternalVariables.FUNCTION_CONDITIONAL_TRANSFERS)
      );

      /**
       * Case 3 - If there is a `parsedTransfers`, then we are resuming Function step execution after
       *          obtaining user input
       */
      if (parsedTransfers.success) {
        const conditionalTransfers = parsedTransfers.data;
        const requestContext: FunctionRequestContext = {
          event: runtime.getRequest(),
        };

        const nextId = handleListenResponse(conditionalTransfers, requestContext, invocation.paths);

        runtime.storage.set(InternalVariables.FUNCTION_CONDITIONAL_TRANSFERS, null);

        return nextId;
      }

      /**
       * Case 4 - A bug has occurred. The function step was told to listen, but for some reason, there
       *          were no valid `parsedTransfers` stored.
       */
      throw new Error('function step execution received user input, but function step has no input handlers');
    } catch (err) {
      // !TODO! - Revamp `general-runtime` types to allow users to modify the built-in
      //          trace types and avoid this `as` cast.
      runtime.trace.addTrace(createFunctionExceptionDebugTrace(err) as BaseTrace.DebugTrace);

      return null;
    }
  },
});

export default () => FunctionHandler(utilsObj);
