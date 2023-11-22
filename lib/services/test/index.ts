import { FunctionCompiledNode } from '@voiceflow/dtos';
import { performance } from 'perf_hooks';

import { ExecuteFunctionException } from '@/runtime/lib/Handlers/function/lib/execute-function/exceptions/execute-function.exception';
import { executeFunction } from '@/runtime/lib/Handlers/function/lib/execute-function/execute-function';

import { AbstractManager } from '../utils';
import { SimplifiedFunctionDefinition, TestFunctionResponse } from './interface';

export class TestService extends AbstractManager {
  private async mockCompileFunctionData(
    functionDefn: SimplifiedFunctionDefinition,
    inputMapping: Record<string, string>
  ): Promise<FunctionCompiledNode['data']> {
    // $TODO$ - Need to incorporate paths into type definition here.
    const { paths: _, code, inputVars, outputVars } = functionDefn;

    return {
      functionDefn: {
        code,
        inputVars,
        outputVars,
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
    functionDefn: SimplifiedFunctionDefinition,
    inputMapping: Record<string, string>
  ): Promise<TestFunctionResponse> {
    try {
      const compiledFunctionData = await this.mockCompileFunctionData(functionDefn, inputMapping);

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
