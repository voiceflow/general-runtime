import { isGeneralRequest } from '@voiceflow/base-types/build/cjs/request';
import { NotImplementedException } from '@voiceflow/exception';
import { isIntentRequest, isTextRequest } from '@voiceflow/utils-designer';

import Runtime from '@/runtime/lib/Runtime';

export interface FunctionRequestContext {
  event?: unknown;
}

export function createFunctionRequestContext(runtime: Runtime): FunctionRequestContext {
  const request = runtime.getRequest();

  if (!isIntentRequest(request) && !isGeneralRequest(request) && !isTextRequest(request)) {
    throw new NotImplementedException('Function received an unexpected request type');
  }

  return {
    event: request,
  };
}
