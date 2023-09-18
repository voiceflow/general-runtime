import { Validator } from '@voiceflow/backend-utils';
import VError from '@voiceflow/verror';
import { VoiceflowConstants, VoiceflowProject } from '@voiceflow/voiceflow-types';

import { shallowObjectIdToString } from '@/runtime/lib/DataAPI/mongoDataAPI';
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

    const getVersion = async (versionID: string) => {
      const version = await this.services.mongo?.db
        .collection('versions')
        .findOne(
          { _id: versionID },
          { projection: { projectID: 1, 'version.platformData.settings.intentConfidence': 1 } }
        );

      if (!version) throw new Error(`Version not found: ${versionID}`);

      return shallowObjectIdToString(version);
    };

    const getProject = async (projectID: string) => {
      const project = await this.services.mongo?.db
        .collection('projects')
        .findOne(
          { _id: projectID },
          { projection: { _id: 1, liveVersion: 1, 'prototype.nlp': 1, 'version.platformData.hasChannelIntents': 1 } }
        );

      if (!project) throw new Error(`Project not found: ${projectID}`);

      return shallowObjectIdToString(project);
    };

    const [version, project] = await Promise.all([getVersion(versionID), getProject(projectID)]);

    if (version.projectID !== project._id) {
      throw new VError('Missmatch in projectID/versionID', VError.HTTP_STATUS.BAD_REQUEST);
    }

    return this.services.nlu.predict({
      versionID,
      query: req.query.query,
      tag: project.liveVersion === versionID ? VersionTag.PRODUCTION : VersionTag.DEVELOPMENT,
      nlp: !!project.prototype?.nlp,
      hasChannelIntents: (project as VoiceflowProject.Project)?.platformData?.hasChannelIntents,
      workspaceID: project.teamID,
      intentConfidence: version?.platformData?.settings?.intentConfidence,
    });
  }
}

export default NLUController;
