import { RuntimeCommand } from '@/runtime/lib/Handlers/function/runtime-command/runtime-command.dto';

export interface TestFunctionResponse {
  success: boolean;
  latencyMS: number;
  runtimeCommands: RuntimeCommand;
}
