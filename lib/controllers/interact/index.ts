/**
 * [[include:contextHandlers.md]]
 * @packageDocumentation
 */

import { BaseRequest, RuntimeLogs } from '@voiceflow/base-types';
import { AnyRequestDTO } from '@voiceflow/dtos';
import { createSession } from 'better-sse';

import { RuntimeRequest } from '@/lib/services/runtime/types';
import { State } from '@/runtime';
import { Request, Response } from '@/types';

import { ResponseContext } from '../../services/interact';
import { validate } from '../../utils';
import { SharedValidations } from '../../validations';
import { AbstractController } from '../utils';
import { InteractRequestBody, InteractRequestParams } from './dtos/interact.request';
import { SSE_KEEP_ALIVE_MS, SSE_RETRY_MS } from './interact.const';

class InteractController extends AbstractController {
  async stream(req: Request<InteractRequestParams, InteractRequestBody>, res: Response) {
    const params = await InteractRequestParams.parseAsync(req.params);
    const body = await InteractRequestBody.parseAsync(req.body);

    const { projectID } = params;
    const { versionID } = params;
    const { sessionID } = body.session;
    const { userID } = body.session;
    const action = await AnyRequestDTO.parseAsync(req.body.action);
    const { state } = body;

    try {
      const session = await createSession(req, res, {
        keepAlive: SSE_KEEP_ALIVE_MS,
        retry: SSE_RETRY_MS,
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
    if (req.body.request) {
      req.body.request = AnyRequestDTO.parse(req.body.request);
    }
    if (req.body.action) {
      req.body.action = AnyRequestDTO.parse(req.body.action);
    }

    return this.services.interact.handler(req);
  }
}

export default InteractController;
