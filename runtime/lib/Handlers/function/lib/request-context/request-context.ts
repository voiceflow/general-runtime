import { isGeneralRequest } from '@voiceflow/base-types/build/cjs/request';
import { NotImplementedException } from '@voiceflow/exception';

import Runtime from '@/runtime/lib/Runtime';

export interface FunctionRequestContext {
  event?: unknown;
}

export function createFunctionRequestContext(runtime: Runtime): FunctionRequestContext {
  const request = runtime.getRequest();

  if (isGeneralRequest(request)) {
    return {
      event: request,
    };
  }

  throw new NotImplementedException('Function received an unexpected request type');
}
