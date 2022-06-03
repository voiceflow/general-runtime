import { Validator } from '@voiceflow/backend-utils';

import { isLogLevelResolvable, resolveLogLevel } from '@/runtime/lib/Runtime/DebugLogging/utils';

const { query } = Validator;

export const QUERY = {
  LOGS: query('logs')
    .optional()
    // TODO: Need to test these validations
    .custom((value: unknown) => isLogLevelResolvable(value))
    .withMessage('must be a known log level, boolean, or undefined')
    .customSanitizer(resolveLogLevel),
};
