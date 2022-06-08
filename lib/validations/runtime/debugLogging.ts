import { Validator } from '@voiceflow/backend-utils';

import CONFIG from '@/config';
import { isLogLevelResolvable, resolveLogLevel } from '@/runtime/lib/Runtime/DebugLogging/utils';

const { query } = Validator;

export const QUERY = {
  LOGS: CONFIG.FF_RUNTIME_LOGGING
    ? query('logs')
        .optional()
        .custom((value: unknown) => isLogLevelResolvable(value))
        .withMessage('must be a known log level, boolean, or undefined')
        .customSanitizer(resolveLogLevel)
    : query('logs')
        .optional()
        .custom(() => {
          throw new Error('The runtime logging feature flag is not enabled');
        }),
};
