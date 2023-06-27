export interface SandboxOptions {
  shouldEnableInject: boolean;
}

type SimpleType = number | string | boolean;
type SimpleOutput = Record<string, SimpleType | SimpleType[] | Record<string, SimpleType>>;

export interface SandboxResult {
  output: SimpleOutput;
  port?: string;
}
