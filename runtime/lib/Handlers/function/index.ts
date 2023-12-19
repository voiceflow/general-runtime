import { BaseTrace } from '@voiceflow/base-types';
import { BaseTraceFrame } from '@voiceflow/base-types/build/cjs/trace';
import { replaceVariables } from '@voiceflow/common';
import { FunctionCompiledData, FunctionCompiledNode, NodeType } from '@voiceflow/dtos';

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

const DIAGRAM_VARIABLE_REGEX = /^{\w[\dA-Za-z]*}$/g;

function applyOutputCommand(
  command: OutputVarsCommand,
  runtime: Runtime,
  variables: Store,
  outputVarDeclarations: FunctionCompiledData['outputVars'],
  outputMapping: FunctionCompiledNode['data']['outputMapping']
): void {
  Object.keys(outputVarDeclarations).forEach((functionVarName) => {
    const diagramVariableToken = outputMapping[functionVarName];

    if (diagramVariableToken === null) return;

    const diagramVariableNameMatches = diagramVariableToken.match(DIAGRAM_VARIABLE_REGEX);

    if (diagramVariableNameMatches === null) {
      throw new Error('Assignment target of output variable command has invalid format');
    }

    const firstMatch = diagramVariableNameMatches[0];
    const diagramVariableName = firstMatch.substring(1, firstMatch.length - 1);

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

function applyNextCommand(command: NextCommand, paths: FunctionCompiledNode['data']['paths']): string | null {
  if ('path' in command) {
    return paths[command.path] ?? null;
  }
  return null;
}

export const FunctionHandler: HandlerFactory<FunctionCompiledNode, typeof utilsObj> = (utils) => ({
  canHandle: (node) => node.type === NodeType.FUNCTION,

  handle: async (node, runtime, variables): Promise<string | null> => {
    const {
      functionDefinition: { outputVars: outputVarDeclarations },
      outputMapping,
      paths,
    } = node.data;

    try {
      const resolvedInputMapping = Object.entries(node.data.inputMapping).reduce((acc, [varName, value]) => {
        return {
          ...acc,
          [varName]: utils.replaceVariables(value, variables.getState()),
        };
      }, {});

      const { next, outputVars, trace } = await executeFunction({
        ...node.data,
        inputMapping: resolvedInputMapping,
      });

      if (outputVars) {
        applyOutputCommand(outputVars, runtime, variables, outputVarDeclarations, outputMapping);
      }

      if (trace) {
        applyTraceCommand(trace, runtime);
      }

      if (next) {
        return applyNextCommand(next, paths);
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
