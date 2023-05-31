import { Validator } from '@voiceflow/backend-utils';

import { Request } from '@/types';

import { customAJV, validate } from '../../utils';
import { AbstractController } from '../utils';
import { FeedbackSchema } from './requests';

const { body, header } = Validator;
const VALIDATIONS = {
  BODY: {
    FEEDBACK: body().custom(customAJV(FeedbackSchema)),
  },
  HEADERS: {
    PROJECT_ID: header('projectID').exists().isString(),
    VERSION_ID: header('versionID').exists().isString(),
  },
};

class FeedbackController extends AbstractController {
  static VALIDATIONS = VALIDATIONS;

  @validate({
    HEADERS_PROJECT_ID: VALIDATIONS.HEADERS.PROJECT_ID,
    HEADERS_VERSION_ID: VALIDATIONS.HEADERS.VERSION_ID,
    BODY_FEEDBACK: VALIDATIONS.BODY.FEEDBACK,
  })
  async handler(
    req: Request<
      { userID: string },
      { name: string } & {
        [key: string]: any;
      },
      { projectID: string; versionID: string }
    >
  ) {
    await this.services.feedback
      .track({
        projectID: req.headers.projectID,
        versionID: req.headers.versionID,
        userID: req.params.userID,
        ...req.body,
      })
      .catch(() => null);

    return {};
  }
}

export default FeedbackController;
