import { CompiledFunctionDefinition, CompiledFunctionInvocation } from '@voiceflow/dtos';
import { performance } from 'perf_hooks';

import { executeFunction } from '@/runtime/lib/Handlers/function/lib/execute-function/execute-function';
import { createFunctionExceptionDebugTrace } from '@/runtime/lib/Handlers/function/lib/function-exception/function.exception';
import { UnknownTrace } from '@/runtime/lib/Handlers/function/runtime-command/trace/base.dto';

import { AbstractManager } from '../utils';
import { TestFunctionResponse } from './interface';

export class TestService extends AbstractManager {
  public async testFunction(
    code: string,
    definition: Pick<CompiledFunctionDefinition, 'inputVars' | 'pathCodes'>,
    invocation: Pick<CompiledFunctionInvocation, 'inputVars'>
  ): Promise<TestFunctionResponse> {
    let startTime = null;
    let endTime = null;

    try {
      startTime = performance.now();
      const runtimeCommands = await executeFunction({
        source: { code },
        definition,
        invocation,
      });
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

      const debugTrace: UnknownTrace = createFunctionExceptionDebugTrace(err);

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
