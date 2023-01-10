/**
 * Google noReply needs to be used in favor of general noReply because
 * it also matches against a specific intent given by google for no input
 */
import { BaseRequest } from '@voiceflow/base-types';

import { Runtime } from '@/runtime';

import NoReplyHandler from '.';

const NO_INPUT_PREFIX = 'actions.intent.NO_INPUT';

export const NoReplyGoogleHandler = () => {
  const { handle } = NoReplyHandler();
  return {
    handle,
    canHandle: (runtime: Runtime) => {
      const request = runtime.getRequest() ?? {};
      return (
        request.payload?.action?.startsWith(NO_INPUT_PREFIX) ||
        request.payload?.intent?.name?.startsWith(NO_INPUT_PREFIX) ||
        BaseRequest.isNoReplyRequest(request) ||
        false
      );
    },
  };
};

export default () => NoReplyGoogleHandler();
