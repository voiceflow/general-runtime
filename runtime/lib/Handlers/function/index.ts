import { BaseTrace } from '@voiceflow/base-types';
import { BaseTraceFrame } from '@voiceflow/base-types/build/cjs/trace';
import {
  FunctionCompiledDefinition,
  FunctionCompiledInvocation,
  FunctionCompiledNode,
  NodeType,
} from '@voiceflow/dtos';

import { HandlerFactory } from '@/runtime/lib/Handler';

import Runtime from '../../Runtime';
import { executeFunction } from './lib/execute-function/execute-function';
import { createFunctionExceptionDebugTrace } from './lib/function-exception/function.exception';
import { NextCommand } from './runtime-command/next-command.dto';
import { OutputVarsCommand } from './runtime-command/output-vars-command.dto';
import { TraceCommand } from './runtime-command/trace-command.dto';

const utilsObj = {};

function applyOutputCommand(
  command: OutputVarsCommand,
  runtime: Runtime,
  outputVarDeclarations: FunctionCompiledDefinition['outputVars'],
  outputVarAssignments: FunctionCompiledInvocation['outputVars']
): void {
  Object.keys(outputVarDeclarations).forEach((functionVarName) => {
    const voiceflowVarName = outputVarAssignments[functionVarName];
    if (!voiceflowVarName) return;
    runtime.variables.set(voiceflowVarName, command[functionVarName]);
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

export const FunctionHandler: HandlerFactory<FunctionCompiledNode, typeof utilsObj> = (_) => ({
  canHandle: (node) => node.type === NodeType.FUNCTION,

  handle: async (node, runtime): Promise<string | null> => {
    const { definition, invocation } = node.data;

    try {
      const { next, outputVars, trace } = await executeFunction({
        source: { codeId: definition.codeId },
        ...node.data,
      });

      if (outputVars) {
        applyOutputCommand(outputVars, runtime, definition.outputVars, invocation.outputVars);
      }

      if (trace) {
        applyTraceCommand(trace, runtime);
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
