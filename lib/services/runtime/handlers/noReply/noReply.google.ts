/**
 * Google noReply needs to be used in favor of general noReply because
 * it matches against a specific intent given by google for no input
 */
import { Runtime } from '@/runtime';

import NoReplyHandler from '.';

const NO_INPUT_PREFIX = 'actions.intent.NO_INPUT';

export const NoReplyGoogleHandler = () => ({
  ...NoReplyHandler(),
  canHandle: (runtime: Runtime) => {
    const { payload } = runtime.getRequest() ?? {};
    return payload?.action?.startsWith(NO_INPUT_PREFIX) || payload?.intent?.name?.startsWith(NO_INPUT_PREFIX) || false;
  },
});

export default () => NoReplyGoogleHandler();
