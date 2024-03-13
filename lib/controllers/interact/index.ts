/**
 * [[include:contextHandlers.md]]
 * @packageDocumentation
 */

import { BaseRequest, RuntimeLogs } from '@voiceflow/base-types';
import { createSession } from "better-sse";
import { isEmpty, merge } from "lodash";

import { RuntimeRequest } from '@/lib/services/runtime/types';
import { State } from '@/runtime';
import { Request, Response } from '@/types';

import { InteractRequestBody, InteractRequestHeaders, InteractRequestParams, InteractRequestQuery } from './dtos/interact.request';
import { validate } from '../../utils';
import { SharedValidations } from '../../validations';
import { AbstractController } from '../utils';
import { ResponseContext } from '../../services/interact';

class InteractController extends AbstractController {
  async interact(
    req: Request<
      InteractRequestParams,
      InteractRequestBody,
      InteractRequestHeaders,
      InteractRequestQuery
    >,
    res: Response
  ) {

    const params = await InteractRequestParams.parseAsync(req.params);
    const body = await InteractRequestBody.parseAsync(req.body);
    const _headers = await InteractRequestHeaders.parseAsync(req.headers);
    const _query = await InteractRequestQuery.parseAsync(req.query);

    const projectID = params.projectID;
    const versionID = params.versionID;
    const sessionID = body.session.sessionID;
    const userID = body.session.userID;
    const action = body.action;
    const state = body.state;

    if (req.accepts('text/event-stream')) {
      try {
        const session = await createSession(req, res, {
          keepAlive: 30000,
          retry: 2000,
        });

        const result = await this.services.interact.interact({
          projectID,
          versionID,
          userID,
          sessionID,
          action,
          state,
        }, (event) => {
          switch (event.type) {
            case 'trace': {
              session.push({ type: 'trace', trace: event.trace }, 'trace');
              break;
            }
          }
        });

        session.push({ type: 'state', state: result.state }, 'state');

        session.push({ type: 'end' }, 'end');
      } finally {
        await new Promise<void>((resolve) => res.end('', () => resolve()));
      }
    } else {
      res.setHeader('Content-Type', 'application/json');

      const result = await this.services.interact.interact({
        projectID,
        versionID,
        userID,
        sessionID,
        action,
        state,
      }, () => void 0);

      res.end(JSON.stringify(result));
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
    return this.services.interact.handler(req, () => void 0);
  }
}

export default InteractController;
