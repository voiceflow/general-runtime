import { Validator } from '@voiceflow/backend-utils';
import VError from '@voiceflow/verror';
import { VoiceflowConstants, VoiceflowProject, VoiceflowVersion } from '@voiceflow/voiceflow-types';
import { ObjectId } from 'mongodb';

import { shallowObjectIdToString } from '@/runtime/lib/DataAPI/mongoDataAPI';
import { Request, VersionTag } from '@/types';

import { Predictor } from '../services/classification';
import { castToDTO } from '../services/classification/classification.utils';
import { validate } from '../utils';
import { AbstractController } from './utils';

const { query, param } = Validator;
const VALIDATIONS = {
  QUERY: {
    QUERY: query('query').exists().isString(),
  },
  HEADERS: {
    PROJECT_ID: param('projectID').exists().isString(),
    VERSION_ID: param('versionID').exists().isString(),
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

    const getVersion = async (versionID: string) => {
      const version = await this.services.mongo?.db.collection('versions').findOne<VoiceflowVersion.Version>(
        { _id: new ObjectId(versionID) },
        {
          projection: {
            projectID: 1,
            'prototype.model': 1,
            'platformData.settings.intentConfidence': 1,
          },
        }
      );

      if (!version) throw new Error(`Version not found: ${versionID}`);

      return shallowObjectIdToString(version);
    };

    const getProject = async (projectID: string) => {
      const project = await this.services.mongo?.db.collection('projects').findOne<VoiceflowProject.Project>(
        { _id: new ObjectId(projectID) },
        {
          projection: {
            _id: 1,
            liveVersion: 1,
            nluSettings: 1,
            'prototype.nlp': 1,
            'platformData.hasChannelIntents': 1,
          },
        }
      );

      if (!project) throw new Error(`Project not found: ${projectID}`);

      return shallowObjectIdToString(project);
    };

    const [version, project] = await Promise.all([getVersion(versionID), getProject(projectID)]);

    if (version.projectID !== project._id) {
      throw new VError('Missmatch in projectID/versionID', VError.HTTP_STATUS.BAD_REQUEST);
    }

    const { intentClassificationSettings, intents, isTrained, slots } = castToDTO(version, project);

    const predictor = new Predictor(
      {
        axios: this.services.axios,
        mlGateway: this.services.mlGateway,
        CLOUD_ENV: this.config.CLOUD_ENV,
        NLU_GATEWAY_SERVICE_URI: this.config.NLU_GATEWAY_SERVICE_URI,
        NLU_GATEWAY_SERVICE_PORT_APP: this.config.NLU_GATEWAY_SERVICE_PORT_APP,
      },
      {
        workspaceID: project.teamID,
        versionID,
        tag: project.liveVersion === versionID ? VersionTag.PRODUCTION : VersionTag.DEVELOPMENT,
        intents: intents ?? [],
        slots: slots ?? [],
        isTrained,
      },
      intentClassificationSettings,
      {
        locale: (version.prototype?.data?.locales?.[0] as VoiceflowConstants.Locale) ?? VoiceflowConstants.Locale.EN_US,
        hasChannelIntents: project?.platformData?.hasChannelIntents,
        platform: version?.prototype?.platform as VoiceflowConstants.PlatformType,
      }
    );
    return predictor.predict(req.query.query);
  }
}

export default NLUController;
