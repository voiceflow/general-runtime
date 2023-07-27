import { Validator } from '@voiceflow/backend-utils';
import { VoiceflowConstants, VoiceflowProject } from '@voiceflow/voiceflow-types';

import { Request, VersionTag } from '@/types';

import { validate } from '../utils';
import { AbstractController } from './utils';

const { query, header } = Validator;
const VALIDATIONS = {
  QUERY: {
    QUERY: query('query').exists().isString(),
  },
  HEADERS: {
    PROJECT_ID: header('projectID').exists().isString(),
    VERSION_ID: header('versionID').exists().isString(),
  },
};

class NLUController extends AbstractController {
  static VALIDATIONS = VALIDATIONS;

  @validate({
    HEADERS_PROJECT_ID: VALIDATIONS.HEADERS.PROJECT_ID,
    HEADERS_VERSION_ID: VALIDATIONS.HEADERS.VERSION_ID,
    QUERY: VALIDATIONS.QUERY.QUERY,
  })
  async inference(req: Request) {
    const { versionID, projectID } = req.headers;

    const api = await this.services.dataAPI.get();
    const [version, project] = await Promise.all([api.getVersion(versionID), api.getProject(projectID)]);

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
