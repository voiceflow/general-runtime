import { BaseTrace } from '@voiceflow/base-types';
import { BaseTraceFrame } from '@voiceflow/base-types/build/cjs/trace';
import { replaceVariables } from '@voiceflow/common';
import {
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

function resolveVariable(value: string, variables: Record<string, unknown>) {
  const trimmedValue = value.trim();
  const onlyVariableRegex = /^{[A-Z_a-z]\w*}$/;
  if (onlyVariableRegex.test(trimmedValue)) {
    const variableName = trimmedValue.substring(1, trimmedValue.length - 1);
    return variables[variableName];
  }
  return replaceVariables(value, variables);
}

export const FunctionHandler: HandlerFactory<FunctionCompiledNode> = () => ({
  canHandle: (node) => node.type === NodeType.FUNCTION,

  handle: async (node, runtime, variables): Promise<string | null> => {
    const { definition, invocation } = node.data;

    try {
      const resolvedInputMapping = Object.entries(invocation.inputVars).reduce((acc, [varName, value]) => {
        return {
          ...acc,
          [varName]: resolveVariable(value, variables.getState()),
        };
      }, {});

      const { next, outputVars, trace } = await executeFunction({
        ...node.data,
        source: {
          codeId: definition.codeId,
        },
        invocation: {
          inputVars: resolvedInputMapping,
        },
      });

      if (outputVars) {
        applyOutputCommand(outputVars, runtime, variables, definition.outputVars, invocation.outputVars);
      }

      if (trace) {
        applyTraceCommand(trace, runtime);
      }

      if (definition.pathCodes.length === 0) {
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

export default () => FunctionHandler();
