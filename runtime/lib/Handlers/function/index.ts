import { BaseTrace } from '@voiceflow/base-types';
import { BaseTraceFrame } from '@voiceflow/base-types/build/cjs/trace';
import { FunctionCompiledData, FunctionCompiledNode, NodeType } from '@voiceflow/dtos';

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
  outputVarDeclrs: FunctionCompiledData['outputVars'],
  outputMapping: FunctionCompiledNode['data']['outputMapping']
): void {
  Object.keys(outputVarDeclrs).forEach((outVarName) => {
    const voiceflowVarName = outputMapping[outVarName];
    if (!voiceflowVarName) return;
    runtime.variables.set(voiceflowVarName, command[outVarName]);
  });
}

function applyTraceCommand(command: TraceCommand, runtime: Runtime): void {
  command.forEach((trace) => {
    runtime.trace.addTrace(trace as BaseTraceFrame);
  });
}

function applyNextCommand(command: NextCommand, paths: FunctionCompiledNode['data']['paths']): string | null {
  if ('path' in command) {
    const nextStepId = paths[command.path];
    return nextStepId ?? null;
  }
  return null;
}

export const FunctionHandler: HandlerFactory<FunctionCompiledNode, typeof utilsObj> = (_) => ({
  canHandle: (node) => node.type === NodeType.FUNCTION,

  handle: async (node, runtime): Promise<string | null> => {
    const {
      functionDefinition: { outputVars: outputVarDeclrs },
      outputMapping,
      paths,
    } = node.data;

    try {
      const { next, outputVars, trace } = await executeFunction(node.data);

      if (outputVars) {
        applyOutputCommand(outputVars, runtime, outputVarDeclrs, outputMapping);
      }

      if (trace) {
        applyTraceCommand(trace, runtime);
      }

      if (next) {
        return applyNextCommand(next, paths);
      }

      return null;
    } catch (err) {
      runtime.trace.addTrace<BaseTrace.DebugTrace>(createFunctionExceptionDebugTrace(err));

      return null;
    }
  },
});

export default () => FunctionHandler(utilsObj);
