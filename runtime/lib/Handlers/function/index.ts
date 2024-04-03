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

import { HandlerFactory } from '@/runtime/lib/Handler';

import Runtime from '../../Runtime';
import Store from '../../Runtime/Store';
import { executeFunction } from './lib/execute-function/execute-function';
import { createFunctionExceptionDebugTrace } from './lib/function-exception/function.exception';
import { NextCommand } from './runtime-command/next-command.dto';
import { OutputVarsCommand } from './runtime-command/output-vars-command.dto';
import { TraceCommand } from './runtime-command/trace-command.dto';

const utilsObj = {
  replaceVariables,
};

function applyOutputCommand(
  command: OutputVarsCommand,
  runtime: Runtime,
  variables: Store,
  outputVarDeclarations: FunctionCompiledDefinition['outputVars'],
  outputVarAssignments: FunctionCompiledInvocation['outputVars']
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

function applyNextCommand(command: NextCommand, paths: FunctionCompiledInvocation['paths']): string | null {
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

export const FunctionHandler: HandlerFactory<FunctionCompiledNode, typeof utilsObj> = (utils) => ({
  canHandle: (node) => node.type === NodeType.FUNCTION,

  handle: async (node, runtime, variables): Promise<string | null> => {
    const { definition, invocation } = node.data;

    const resolvedDefinition = resolveFunctionDefinition(definition, runtime.version!);

    try {
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
        applyOutputCommand(outputVars, runtime, variables, resolvedDefinition.outputVars, invocation.outputVars);
      }

      if (trace) {
        applyTraceCommand(trace, runtime);
      }

      if (resolvedDefinition.pathCodes.length === 0) {
        return invocation.paths.__vf__default ?? null;
      }
      if (next) {
        return applyNextCommand(next, invocation.paths);
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
