export interface FunctionLambdaRequest {
  code: string;
  variables: Record<string, unknown>;
  enableLog?: boolean;
}
