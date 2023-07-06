export interface SandboxOptions {
  shouldEnableInject: boolean;
  fetchTimeoutMS: number;
  fetchMaxResponseSizeBytes: number;
}

type SimpleType = number | string | boolean;
type SimpleOutput = Record<string, SimpleType | SimpleType[] | Record<string, SimpleType>>;

export interface SandboxResult {
  output: SimpleOutput;
  port?: string;
}
