import { Validator } from '@voiceflow/backend-utils';

import { Request } from '@/types';

import { customAJV, validate } from '../../utils';
import { AbstractController } from '../utils';
import { TranscriptSchema } from './requests';

const { body, header } = Validator;
const VALIDATIONS = {
  BODY: {
    TRANSCRIPT: body().custom(customAJV(TranscriptSchema)),
  },
  HEADERS: {
    PROJECT_ID: header('projectID').exists().isString(),
  },
};

class TranscriptController extends AbstractController {
  @validate({
    HEADERS_PROJECT_ID: VALIDATIONS.HEADERS.PROJECT_ID,
    BODY_TRANSCRIPT: VALIDATIONS.BODY.TRANSCRIPT,
  })
  async createTranscript(
    req: Request<
      never,
      {
        sessionID: string;
        device?: string;
        os?: string;
        browser?: string;
        user?: { name?: string; image?: string };
        unread?: boolean;
      },
      { projectID: string }
    >
  ) {
    const { unread } = req.body;
    return this.services.transcript.createTranscript(req.headers.projectID, req.body.sessionID, req.body, unread);
  }
}

export default TranscriptController;
