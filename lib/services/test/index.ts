import { BaseTrace } from '@voiceflow/base-types';
import { FunctionCompiledNode } from '@voiceflow/dtos';
import { performance } from 'perf_hooks';

import { createFunctionExceptionDebugTrace } from '@/runtime/lib/Handlers/function/lib/execute-function/exceptions/createFunctionExceptionDebugTrace';
import { executeFunction } from '@/runtime/lib/Handlers/function/lib/execute-function/execute-function';

import { AbstractManager } from '../utils';
import { SimplifiedFunctionDefinition, TestFunctionResponse } from './interface';

export class TestService extends AbstractManager {
  private async mockCompileFunctionData(
    functionDefinition: SimplifiedFunctionDefinition,
    inputMapping: Record<string, string>
  ): Promise<FunctionCompiledNode['data']> {
    const { pathCodes, code, inputVars, outputVars } = functionDefinition;

    return {
      functionDefinition: {
        code,
        inputVars,
        outputVars,
        pathCodes,
      },
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
    functionDefinition: SimplifiedFunctionDefinition,
    inputMapping: Record<string, string>
  ): Promise<TestFunctionResponse> {
    let startTime = null;
    let endTime = null;

    try {
      const compiledFunctionData = await this.mockCompileFunctionData(functionDefinition, inputMapping);

      startTime = performance.now();
      const runtimeCommands = await executeFunction(compiledFunctionData);
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

      const debugTrace: BaseTrace.DebugTrace = createFunctionExceptionDebugTrace(err);

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
