import { FunctionCompiledData, FunctionCompiledNode } from '@voiceflow/dtos';
import { performance } from 'perf_hooks';

import { executeFunction } from '@/runtime/lib/Handlers/function/lib/execute-function/execute-function';
import { createFunctionExceptionDebugTrace } from '@/runtime/lib/Handlers/function/lib/function-exception/function.exception';
import { Trace } from '@/runtime/lib/Handlers/function/runtime-command/trace-command.dto';

import { AbstractManager } from '../utils';
import { TestFunctionResponse } from './interface';

export class TestService extends AbstractManager {
  private async mockCompileFunctionNodeData(
    functionDefinition: FunctionCompiledData,
    inputMapping: Record<string, string>
  ): Promise<FunctionCompiledNode['data']> {
    return {
      functionDefinition,
      inputMapping,
      /**
       * Output variables are not mapped and ports are not followed. Instead, testing
       * a function directly returns the produced runtime commands for debugging.
       */
      outputMapping: {},
      paths: {},
    };
  }

  public async testFunction(
    functionDefinition: FunctionCompiledData,
    inputMapping: Record<string, string>
  ): Promise<TestFunctionResponse> {
    let startTime = null;
    let endTime = null;

    try {
      const mockFunctionNodeData = await this.mockCompileFunctionNodeData(functionDefinition, inputMapping);

      startTime = performance.now();
      const runtimeCommands = await executeFunction(mockFunctionNodeData);
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
