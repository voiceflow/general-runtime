import { BaseNode, BaseTrace } from '@voiceflow/base-types';
import { FunctionCompiledData, FunctionCompiledNode, FunctionVariableKind, NodeType } from '@voiceflow/dtos';
import { match } from 'ts-pattern';

import { HandlerFactory } from '@/runtime/lib/Handler';

import Runtime from '../../Runtime';
import { adaptTrace } from './lib/adapt-trace/adapt-trace';
import { ExecuteFunctionException } from './lib/execute-function/exceptions/execute-function.exception';
import { isFunctionPathException } from './lib/execute-function/exceptions/function-path.exception';
import { isFunctionTypeException } from './lib/execute-function/exceptions/function-type.exception';
import { executeFunction } from './lib/execute-function/execute-function';
import { NextCommand } from './runtime-command/next-command/next-command.dto';
import { OutputVarsCommand } from './runtime-command/output-vars-command/output-vars-command.dto';
import { TraceCommand } from './runtime-command/trace-command/trace-command.dto';

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
    runtime.trace.addTrace(adaptTrace(trace));
  });
}

function applyNextCommand(command: NextCommand, paths: FunctionCompiledNode['data']['paths']): string | null {
  if ('path' in command) {
    const nextStepId = paths[command.path];
    return nextStepId ?? null;
  }
  return null;
}

function reportRuntimeException(err: ExecuteFunctionException, runtime: Runtime) {
  const debugMessage = match(err)
    .when(
      (val) => val instanceof ExecuteFunctionException,
      (err) => err.toCanonicalError()
    )
    .otherwise((err) => `Received an unknown error: ${err.message.slice(0, 300)}`);

  runtime.trace.addTrace<BaseTrace.DebugTrace>({
    type: BaseNode.Utils.TraceType.DEBUG,
    payload: {
      message: `[ERROR]: ${debugMessage}`,
    },
  });
}

export const FunctionHandler: HandlerFactory<FunctionCompiledNode, typeof utilsObj> = (_) => ({
  canHandle: (node) => node.type === NodeType.FUNCTION,

  handle: async (node, runtime): Promise<string | null> => {
    const {
      functionDefn: { outputVars: outputVarDeclrs },
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
      if (!(err instanceof ExecuteFunctionException)) {
        runtime.trace.addTrace<BaseTrace.DebugTrace>({
          type: BaseNode.Utils.TraceType.DEBUG,
          payload: {
            message: `[ERROR]: Unknown error, payload=${JSON.stringify(err, null, 2).slice(0, 200)}`,
          },
        });

        throw err;
      }

      reportRuntimeException(err, runtime);

      return null;
    }
  },
});

export default () => FunctionHandler(utilsObj);
