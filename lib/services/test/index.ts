import { Function as FunctionDefinition, FunctionCompiledNode } from '@voiceflow/dtos';
import { NotImplementedException } from '@voiceflow/exception';
import { performance } from 'perf_hooks';

import { executeFunction } from '@/runtime/lib/Handlers/function/lib/execute-function/execute-function';

import { AbstractManager } from '../utils';
import { TestFunctionResponse } from './interface';

export class TestService extends AbstractManager {
  private pullFunctionDefinition(functionID: string): Promise<FunctionDefinition> {
    throw new NotImplementedException(`not implemented, ${functionID}`);
  }

  private mockCompileFunctionData(
    func: FunctionDefinition,
    inputMapping: Record<string, unknown>
  ): Promise<FunctionCompiledNode['data']> {
    throw new NotImplementedException(`not implemented, ${func} ${inputMapping}`);
  }

  public async testFunction(functionID: string, inputMapping: Record<string, unknown>): Promise<TestFunctionResponse> {
    const functionDefinition = await this.pullFunctionDefinition(functionID);
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
  }
}
