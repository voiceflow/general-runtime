import { Validator } from '@voiceflow/backend-utils';
import VError from '@voiceflow/verror';
import { VoiceflowConstants, VoiceflowProject } from '@voiceflow/voiceflow-types';

import { Request, VersionTag } from '@/types';

import { validate } from '../utils';
import { AbstractController } from './utils';

const { query, param } = Validator;
const VALIDATIONS = {
  QUERY: {
    QUERY: query('query').exists().isString(),
  },
  PARAMS: {
    PROJECT_ID: param('projectID').exists().isString(),
    VERSION_ID: param('versionID').exists().isString(),
  },
};

class NLUController extends AbstractController {
  static VALIDATIONS = VALIDATIONS;

  @validate({
    PARAMS_PROJECT_ID: VALIDATIONS.PARAMS.PROJECT_ID,
    PARAMS_VERSION_ID: VALIDATIONS.PARAMS.VERSION_ID,
    QUERY: VALIDATIONS.QUERY.QUERY,
  })
  async inference(req: Request) {
    const { versionID, projectID } = req.params;

    const api = await this.services.dataAPI.get();
    const [version, project] = await Promise.all([api.getVersion(versionID), api.getProject(projectID)]);

    if (version.projectID !== project._id) {
      throw new VError('Missmatch in projectID/versionID', VError.HTTP_STATUS.BAD_REQUEST);
    }

    return this.services.nlu.predict({
      versionID,
      query: req.query.query,
      model: version.prototype?.model,
      locale: version.prototype?.data?.locales?.[0],
      tag: project.liveVersion === versionID ? VersionTag.PRODUCTION : VersionTag.DEVELOPMENT,
      nlp: project.prototype?.nlp,
      hasChannelIntents: (project as VoiceflowProject.Project)?.platformData?.hasChannelIntents,
      platform: version?.prototype?.platform as VoiceflowConstants.PlatformType,
      workspaceID: project.teamID,
    });
  }
}

export default NLUController;
