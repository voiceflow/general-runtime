import { Validator } from '@voiceflow/backend-utils';
import { RuntimeLogs } from '@voiceflow/base-types';

import CONFIG from '@/config';
import { isLogLevelResolvable, resolveLogLevel } from '@/runtime/lib/Runtime/DebugLogging/utils';

const { query } = Validator;

export const QUERY = {
  LOGS: CONFIG.FF_RUNTIME_LOGGING
    ? query('logs')
        .custom((value: unknown) => isLogLevelResolvable(value))
        .withMessage('must be a known log level, boolean, or undefined')
        .customSanitizer(resolveLogLevel)
    : query('logs')
        .custom((value: unknown) => value === undefined)
        .withMessage('The runtime logging feature flag is not enabled')
        .customSanitizer(() => RuntimeLogs.LogLevel.OFF),
};
