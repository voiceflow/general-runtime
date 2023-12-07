interface BaseFunctionLambdaRequest {
  variables: Record<string, unknown>;
  enableLog?: boolean;
}

interface FunctionLambdaRequestWithReference extends BaseFunctionLambdaRequest {
  codeId: string;
}

interface FunctionLambdaRequestWithCode extends BaseFunctionLambdaRequest {
  code: string;
}

export type FunctionLambdaRequest = FunctionLambdaRequestWithReference | FunctionLambdaRequestWithCode;
