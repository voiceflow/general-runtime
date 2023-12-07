import { Enum } from '@voiceflow/dtos/build/cjs/utils/type/enum.util';

export const LambdaErrorCode = {
  /**
   * An unspecific, general error occurred when executing Function code at the function lambda
   */
  General: 'general:error',

  /**
   * Function lambda refused to execute Function code because the request was malformed
   */
  InvalidRequest: 'handler:invalid-request',

  /**
   * Function lambda was provided a reference to the Function code file, but was unable to resolve it
   */
  FunctionCodeNotFound: 'function-code:not-found',

  /**
   * An exception was thrown by the executed Function code
   */
  SandboxRuntimeError: 'sandbox:runtime-error',

  /**
   * An exception was thrown because user code contained an invalid module that could not be resolved.
   */
  SandboxModuleResolution: 'sandbox:module-resolution',
} as const;

export type LambdaErrorCode = Enum<typeof LambdaErrorCode>;
