/**
 * [[include:contextHandlers.md]]
 * @packageDocumentation
 */

import { BaseRequest, RuntimeLogs } from '@voiceflow/base-types';
import { createSession } from 'better-sse';

// import { isEmpty, merge } from "lodash";
import { RuntimeRequest } from '@/lib/services/runtime/types';
import { State } from '@/runtime';
import { Request, Response } from '@/types';

import { ResponseContext } from '../../services/interact';
import { validate } from '../../utils';
import { SharedValidations } from '../../validations';
import { AbstractController } from '../utils';
import {
  InteractRequestBody,
  InteractRequestHeaders,
  InteractRequestParams,
  InteractRequestQuery,
} from './dtos/interact.request';

class InteractController extends AbstractController {
  async stream(
    req: Request<InteractRequestParams, InteractRequestBody, InteractRequestHeaders, InteractRequestQuery>,
    res: Response
  ) {
    const params = await InteractRequestParams.parseAsync(req.params);
    const body = await InteractRequestBody.parseAsync(req.body);
    // const _headers = await InteractRequestHeaders.parseAsync(req.headers);
    // const _query = await InteractRequestQuery.parseAsync(req.query);

    const { projectID } = params;
    const { versionID } = params;
    const { sessionID } = body.session;
    const { userID } = body.session;
    const { action } = body;
    const { state } = body;

    try {
      const session = await createSession(req, res, {
        keepAlive: 30000,
        retry: 2000,
      });

      const result = await this.services.interact.interact(
        {
          projectID,
          versionID,
          userID,
          sessionID,
          action,
          state,
        },
        (event) => {
          if ('trace' in event) {
            session.push({ type: event.type, trace: event.trace }, event.type);
          }
        }
      );

      session.push({ type: 'state', state: result.state }, 'state');

      session.push({ type: 'end' }, 'end');
    } finally {
      await new Promise<void>((resolve) => {
        res.end('', () => resolve());
      });
    }
  }

  async state(req: { headers: { versionID: string } }): Promise<State> {
    const { versionID } = req.headers;
    return this.services.interact.state(versionID);
  }

  @validate({
    QUERY_LOGS: SharedValidations.Runtime.QUERY.LOGS,
  })
  async handler(
    req: Request<
      { userID: string },
      { state?: State; action?: RuntimeRequest; request?: RuntimeRequest; config?: BaseRequest.RequestConfig },
      { authorization: string; versionID: string },
      { locale?: string; logs: RuntimeLogs.LogLevel }
    >
  ): Promise<ResponseContext> {
    return this.services.interact.handler(req, () => undefined);
  }
}

export default InteractController;
