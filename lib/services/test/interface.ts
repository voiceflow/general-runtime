import { FunctionVariableType } from '@voiceflow/dtos';

import { RuntimeCommand } from '@/runtime/lib/Handlers/function/runtime-command/runtime-command.dto';

export interface VariableConfig {
  type: typeof FunctionVariableType.STRING;
}
export interface SimplifiedFunctionDefinition {
  code: string;
  paths: Array<{
    name: string;
  }>;
  inputVars: Record<string, VariableConfig>;
  outputVars: Record<string, VariableConfig>;
}

export interface TestFunctionSuccessResponse {
  success: true;
  latencyMS: number;
  runtimeCommands: RuntimeCommand;
}

export interface TestFunctionFailureResponse {
  success: false;
}

export type TestFunctionResponse = TestFunctionSuccessResponse | TestFunctionFailureResponse;
