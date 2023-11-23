import { FunctionVariableType } from '@voiceflow/dtos';

import { RuntimeCommand } from '@/runtime/lib/Handlers/function/runtime-command/runtime-command.dto';

export interface VariableConfig {
  type: typeof FunctionVariableType.STRING;
}
export interface SimplifiedFunctionDefinition {
  code: string;
  pathCodes: Array<string>;
  inputVars: Record<string, VariableConfig>;
  outputVars: Record<string, VariableConfig>;
}

export interface TestFunctionResponse {
  success: boolean;
  latencyMS: number;
  runtimeCommands: RuntimeCommand;
}
