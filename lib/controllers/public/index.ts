import { Validator } from '@voiceflow/backend-utils';
import { BaseRequest } from '@voiceflow/base-types';
import { AnyRequestDTO } from '@voiceflow/dtos';

import { RuntimeRequest } from '@/lib/services/runtime/types';
import { Request } from '@/types';

import { customAJV, validate } from '../../utils';
import { AbstractController } from '../utils';
import { PublicInteractSchema } from './requests';

const { body, header } = Validator;
const VALIDATIONS = {
  BODY: {
    PUBLIC_INTERACT: body().custom(customAJV(PublicInteractSchema)),
  },
  HEADERS: {
    PROJECT_ID: header('projectID').exists().isString(),
    VERSION_ID: header('versionID').exists().isString(),
  },
};

class PublicController extends AbstractController {
  static VALIDATIONS = VALIDATIONS;

  @validate({
    HEADERS_PROJECT_ID: VALIDATIONS.HEADERS.PROJECT_ID,
    HEADERS_VERSION_ID: VALIDATIONS.HEADERS.VERSION_ID,
    BODY_PUBLIC_INTERACT: VALIDATIONS.BODY.PUBLIC_INTERACT,
  })
  async interact(
    req: Request<
      { userID: string },
      { action?: RuntimeRequest; config?: BaseRequest.RequestConfig },
      { projectID: string; versionID: string }
    >
  ) {
    const parsedRequest = {
      ...req,
      body: {
        ...req.body,
        action: AnyRequestDTO.parse(req.body.action),
      },
    };

    const trace = await this.services.stateManagement.interact({
      ...parsedRequest,
      // only pass in select properties to avoid any potential security issues
      query: {}, // no logs allowed
      headers: { projectID: parsedRequest.headers.projectID, versionID: parsedRequest.headers.versionID },
    });

    return { trace };
  }

  @validate({
    HEADERS_VERSION_ID: VALIDATIONS.HEADERS.VERSION_ID,
  })
  async getPublishing(req: Request<{ userID: string }, never, { versionID: string }>) {
    const api = await this.services.dataAPI.get();

    return api.getVersionPublishing(req.headers.versionID);
  }
}

export default PublicController;
