import { FunctionCompiledNode } from '@voiceflow/dtos';
import { performance } from 'perf_hooks';

import { ExecuteFunctionException } from '@/runtime/lib/Handlers/function/lib/execute-function/exceptions/execute-function.exception';
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
      outputMapping: {},
      paths: {},
    };
  }

  private getErrorMessage(err: unknown) {
    if (!(err instanceof ExecuteFunctionException)) {
      return `Encountered an unexpected error, payload = ${JSON.stringify(err, null, 2).slice(0, 200)}`;
    }

    return err.toCanonicalError();
  }

  public async testFunction(
    functionDefinition: SimplifiedFunctionDefinition,
    inputMapping: Record<string, string>
  ): Promise<TestFunctionResponse> {
    try {
      const compiledFunctionData = await this.mockCompileFunctionData(functionDefinition, inputMapping);

      const startTime = performance.now();
      const runtimeCommands = await executeFunction(compiledFunctionData);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      return {
        success: true,
        latencyMS: executionTime,
        runtimeCommands,
      };
    } catch (err) {
      return {
        success: false,
        errorMessage: this.getErrorMessage(err),
      };
    }
  }
}
