import { FunctionCompiledDefinition, FunctionCompiledInvocation } from '@voiceflow/dtos';
import { performance } from 'perf_hooks';

import { executeFunction } from '@/runtime/lib/Handlers/function/lib/execute-function/execute-function';
import { createFunctionExceptionDebugTrace } from '@/runtime/lib/Handlers/function/lib/function-exception/function.exception';
import { Trace } from '@/runtime/lib/Handlers/function/runtime-command/trace-command.dto';

import { AbstractManager } from '../utils';
import { TestFunctionResponse } from './interface';

export class TestService extends AbstractManager {
  public async testFunction(
    code: string,
    definition: Pick<FunctionCompiledDefinition, 'inputVars' | 'pathCodes'>,
    invocation: Pick<FunctionCompiledInvocation, 'inputVars'>
  ): Promise<TestFunctionResponse> {
    let startTime = null;
    let endTime = null;

    const defaultContext = {
      intent_confidence: 0,
      last_event: 0,
      last_response: '',
      last_utterance: '',
      locale: 0,
      platform: 'webchat',
      sessions: 1,
      timestamp: 0,
      user_id: 'TEST_USER',
      projectID: 'dummy',
    };

    try {
      startTime = performance.now();
      const runtimeCommands = await executeFunction(
        {
          source: { code },
          definition,
          invocation,
        },
        defaultContext
      );
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
