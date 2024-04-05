import { BaseTrace, BaseVersion } from '@voiceflow/base-types';
import { BaseTraceFrame } from '@voiceflow/base-types/build/cjs/trace';
import { replaceVariables } from '@voiceflow/common';
import {
  FunctionCompiledData,
  FunctionCompiledDefinition,
  FunctionCompiledInvocation,
  FunctionCompiledNode,
  NodeType,
} from '@voiceflow/dtos';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';

import { HandlerFactory } from '@/runtime/lib/Handler';
import _query from '@/utils/underscore-query';

import Runtime from '../../Runtime';
import Store from '../../Runtime/Store';
import { executeFunction } from './lib/execute-function/execute-function';
import { createFunctionExceptionDebugTrace } from './lib/function-exception/function.exception';
import { createFunctionRequestContext, FunctionRequestContext } from './lib/request-context/request-context';
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
    runtime.variables.set(VoiceflowConstants.BuiltInVariable.FUNCTION_CONDITIONAL_TRANSFERS, { defaultTo, to });

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

export const FunctionHandler: HandlerFactory<FunctionCompiledNode, typeof utilsObj> = (utils) => ({
  canHandle: (node) => node.type === NodeType.FUNCTION,

  handle: async (node, runtime, variables): Promise<string | null> => {
    const { definition, invocation } = node.data;

    const resolvedDefinition = resolveFunctionDefinition(definition, runtime.version!);

    try {
      const parsedTransfers = NextBranchesDTO.safeParse(
        runtime.variables.get(VoiceflowConstants.BuiltInVariable.FUNCTION_CONDITIONAL_TRANSFERS)
      );

      /**
       * Case 1 - If there is a `parsedTransfers`, then we are resuming Function step execution after
       *          obtaining user input
       */
      if (parsedTransfers.success) {
        const conditionalTransfers = parsedTransfers.data;
        const requestContext = createFunctionRequestContext(runtime);

        const nextId = handleListenResponse(conditionalTransfers, requestContext, invocation.paths);

        runtime.variables.set(VoiceflowConstants.BuiltInVariable.FUNCTION_CONDITIONAL_TRANSFERS, null);

        return nextId;
      }

      /**
       * Case 2 - If there are no `parsedTransfers`, then we are hitting this Function step for the
       *          first time
       */
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

      if (resolvedDefinition.pathCodes.length === 0) {
        return invocation.paths.__vf__default ?? null;
      }
      if (next) {
        return applyNextCommand(next, runtime, { nodeId: node.id, paths: invocation.paths });
      }
      return null;
    } catch (err) {
      // !TODO! - Revamp `general-runtime` types to allow users to modify the built-in
      //          trace types and avoid this `as` cast.
      runtime.trace.addTrace(createFunctionExceptionDebugTrace(err) as BaseTrace.DebugTrace);

      return null;
    }
  },
});

export default () => FunctionHandler(utilsObj);
