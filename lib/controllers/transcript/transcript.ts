import { Validator } from '@voiceflow/backend-utils';

import { Request } from '@/types';

import { customAJV, validate } from '../../utils';
import { AbstractController } from '../utils';
import { UpsertTranscriptSchema } from './requests';

const { body, header } = Validator;
const VALIDATIONS = {
  BODY: {
    UPSERT_TRANSCRIPT: body().custom(customAJV(UpsertTranscriptSchema)),
  },
  HEADERS: {
    PROJECT_ID: header('projectID').exists().isString(),
  },
};

class TranscriptController extends AbstractController {
  @validate({
    HEADERS_PROJECT_ID: VALIDATIONS.HEADERS.PROJECT_ID,
    BODY_TRANSCRIPT: VALIDATIONS.BODY.UPSERT_TRANSCRIPT,
  })
  async upsertTranscript(
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
    return this.services.transcript.upsertTranscript(
      req.headers.projectID,
      req.body.sessionID,
      req.body
    );
  }
}

export default TranscriptController;
