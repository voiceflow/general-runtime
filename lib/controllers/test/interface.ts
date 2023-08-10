export type TestFunctionBody = Record<string, unknown>;

export interface TestFunctionParams {
  functionID: string;
}

export enum TestFunctionStatus {
  Success = 'success',
  Failure = 'failure',
}

export interface TestFunctionResponse {
  status: TestFunctionStatus.Success;
  latencyMS: number;
  outputMapping: Record<string, unknown>;
}
