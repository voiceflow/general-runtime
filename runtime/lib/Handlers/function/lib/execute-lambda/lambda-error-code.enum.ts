import { Enum } from '@voiceflow/dtos/build/cjs/utils/type/enum.util';

export const LambdaErrorCode = {
  General: 'general:error',

  InvalidRequest: 'handler:invalid-request',

  SandboxRuntimeError: 'sandbox:runtime-error',

  SandboxModuleResolution: 'sandbox:module-resolution',
} as const;

export type LambdaErrorCode = Enum<typeof LambdaErrorCode>;
