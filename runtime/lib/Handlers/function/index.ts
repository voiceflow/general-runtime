import { BaseNode, BaseTrace } from '@voiceflow/base-types';
import { FunctionCompiledData, FunctionCompiledNode, NodeType } from '@voiceflow/dtos';

import { HandlerFactory } from '@/runtime/lib/Handler';

import Runtime from '../../Runtime';
import { NextCommand } from '../runtime-command/next-command/next-command.dto';
import { OutputVarsCommand } from '../runtime-command/output-vars-command/output-vars-command.dto';
import { TraceCommand } from '../runtime-command/trace-command/trace-command.dto';
import { adaptTrace } from './adapt-trace';
import { executeLambda } from './lambda';
import { validateVariableTypes } from './type-validator';

const utilsObj = {};

function applyOutputCommand(
  command: OutputVarsCommand,
  runtime: Runtime,
  outputVarDeclr: FunctionCompiledData['outputVars'],
  outputMapping: FunctionCompiledNode['data']['outputMapping']
): void {
  // !TODO! - Output variable validation

  Object.keys(outputVarDeclr).forEach((outVarName) => {
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

export const FunctionHandler: HandlerFactory<FunctionCompiledNode, typeof utilsObj> = (_) => ({
  canHandle: (node) => node.type === NodeType.FUNCTION,

  handle: async (node, runtime): Promise<string | null> => {
    const {
      functionDefn: { code, inputVars: inputVarDeclr, outputVars: outputVarDeclr },
      inputMapping,
      outputMapping,
      paths,
    } = node.data;

    const validationResult = await validateVariableTypes(inputMapping, inputVarDeclr);
    if (!validationResult.success) {
      const { variable, expectedType } = validationResult;
      runtime.trace.addTrace<BaseTrace.DebugTrace>({
        type: BaseNode.Utils.TraceType.DEBUG,
        payload: {
          message: `Function step received an invalid argument for input variable ${variable} with expected type ${expectedType} but received ${typeof inputMapping[
            variable
          ]} instead.`,
        },
      });
    }

    const { next, outputVars, trace } = await executeLambda(code, inputMapping);

    if (outputVars) {
      applyOutputCommand(outputVars, runtime, outputVarDeclr, outputMapping);
    }

    if (trace) {
      applyTraceCommand(trace, runtime);
    }

    if (next) {
      return applyNextCommand(next, paths);
    }

    return null;
  },
});

export default () => FunctionHandler(utilsObj);
