import { CompiledFunctionVariableDeclaration } from '@voiceflow/dtos';

interface BaseExecuteFunctionArgs {
  definition: {
    inputVars: Record<string, CompiledFunctionVariableDeclaration>;
    pathCodes: string[];
  };
  invocation: {
    inputVars: Record<string, string>;
  };
}

export interface ExecuteFunctionWithReferenceArgs extends BaseExecuteFunctionArgs {
  source: {
    codeId: string;
  };
}

export interface ExecuteFunctionWithCodeArgs extends BaseExecuteFunctionArgs {
  source: {
    code: string;
  };
}

export type ExecuteFunctionArgs = ExecuteFunctionWithReferenceArgs | ExecuteFunctionWithCodeArgs;
