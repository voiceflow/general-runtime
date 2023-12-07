import { FunctionCompiledDefinition, FunctionCompiledInvocation } from '@voiceflow/dtos';
import { performance } from 'perf_hooks';

import { executeFunction } from '@/runtime/lib/Handlers/function/lib/execute-function/execute-function';
import { ExecuteFunctionArgs } from '@/runtime/lib/Handlers/function/lib/execute-function/execute-function.interface';
import { createFunctionExceptionDebugTrace } from '@/runtime/lib/Handlers/function/lib/function-exception/function.exception';
import { Trace } from '@/runtime/lib/Handlers/function/runtime-command/trace-command.dto';

import { AbstractManager } from '../utils';
import { TestFunctionResponse } from './interface';

export class TestService extends AbstractManager {
  private async createExecuteFunctionArgs(
    code: string,
    definition: Pick<FunctionCompiledDefinition, 'inputVars' | 'pathCodes'>,
    invocation: Pick<FunctionCompiledInvocation, 'inputVars'>
  ): Promise<ExecuteFunctionArgs> {
    return {
      source: { code },
      definition,
      invocation,
    };
  }

  public async testFunction(
    code: string,
    definition: Pick<FunctionCompiledDefinition, 'inputVars' | 'pathCodes'>,
    invocation: Pick<FunctionCompiledInvocation, 'inputVars'>
  ): Promise<TestFunctionResponse> {
    let startTime = null;
    let endTime = null;

    try {
      const executeFunctionArgs = await this.createExecuteFunctionArgs(code, definition, invocation);

      startTime = performance.now();
      const runtimeCommands = await executeFunction(executeFunctionArgs);
      endTime = performance.now();

      const executionTime = endTime - startTime;

      return {
        success: true,
        latencyMS: executionTime,
        runtimeCommands,
      };
    } catch (err) {
      if (startTime === null) {
        startTime = 0;
        endTime = 0;
      } else if (endTime === null) {
        endTime = performance.now();
      }

      const executionTime = endTime - startTime;

      const debugTrace: Trace = createFunctionExceptionDebugTrace(err);

      return {
        success: false,
        latencyMS: executionTime,
        runtimeCommands: {
          trace: [debugTrace],
        },
      };
    }
  }
}
