/**
 * [[include:contextHandlers.md]]
 * @packageDocumentation
 */

import { Validator } from '@voiceflow/backend-utils';
import { BaseRequest, RuntimeLogs } from '@voiceflow/base-types';
import assert from 'assert/strict';

import { ResponseContext } from '@/lib/services/interact';
import { RuntimeRequest } from '@/lib/services/runtime/types';
import { State } from '@/runtime';
import { isLogLevelResolvable, LogLevelResolvable, resolveLogLevel } from '@/runtime/lib/Runtime/DebugLogging/utils';
import { Request } from '@/types';

import { validate } from '../utils';
import { AbstractController } from './utils';

const { query } = Validator;
const VALIDATIONS = {
  QUERY: {
    // TODO: Copy the validations over from StateManagementController once finalized.
    // eslint-disable-next-line no-secrets/no-secrets
    // TODO: Consider reusing a definition rather than duplicating this - see https://voiceflowhq.slack.com/archives/CGFFRC588/p1653689182510919
    LOGS: query('logs')
      .custom((value: unknown) => {
        assert(isLogLevelResolvable(value), new Error('logs query param must be a string, boolean, or undefined'));
      })
      .customSanitizer((value: LogLevelResolvable): RuntimeLogs.LogLevel => {
        return resolveLogLevel(value);
      }),
  },
};

class InteractController extends AbstractController {
  async state(req: { headers: { authorization?: string; origin?: string; versionID: string } }): Promise<State> {
    return this.services.interact.state(req);
  }

  @validate({
    QUERY_LOGS: VALIDATIONS.QUERY.LOGS,
  })
  async handler(
    req: Request<
      Record<string, unknown>,
      { state?: State; action?: RuntimeRequest; request?: RuntimeRequest; config?: BaseRequest.RequestConfig },
      { versionID: string },
      { locale?: string; logs: RuntimeLogs.LogLevel }
    >
  ): Promise<ResponseContext> {
    return this.services.interact.handler({
      ...req,
      query: {
        ...req.query,
        maxLogLevel: req.query.logs,
      },
    });
  }
}

export default InteractController;
