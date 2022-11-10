import { Validator } from '@voiceflow/backend-utils';
import { BaseRequest } from '@voiceflow/base-types';
import { ObjectId } from 'mongodb';

import { RuntimeRequest } from '@/lib/services/runtime/types';
import { Request } from '@/types';

import { customAJV, validate } from '../../utils';
import { AbstractController } from '../utils';
import { PublicInteractSchema, TranscriptSchema } from './requests';

const { body, header } = Validator;
const VALIDATIONS = {
  BODY: {
    PUBLIC_INTERACT: body().custom(customAJV(PublicInteractSchema)),
    TRANSCRIPT: body().custom(customAJV(TranscriptSchema)),
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
    const trace = await this.services.stateManagement.interact({
      ...req,
      // only pass in select properties to avoid any potential security issues
      query: {}, // no logs allowed
      headers: { projectID: req.headers.projectID, versionID: req.headers.versionID },
    });

    return { trace };
  }

  @validate({
    HEADERS_VERSION_ID: VALIDATIONS.HEADERS.VERSION_ID,
  })
  async getPublishing(req: Request<{ userID: string }, never, { versionID: string }>) {
    const api = await this.services.dataAPI.get();

    const version = await api.getVersion(req.headers.versionID);

    return version.platformData.publishing || {};
  }

  @validate({
    HEADERS_PROJECT_ID: VALIDATIONS.HEADERS.PROJECT_ID,
    BODY_TRANSCRIPT: VALIDATIONS.BODY.TRANSCRIPT,
  })
  async createTranscript(
    req: Request<
      never,
      { sessionID: string; device?: string; os?: string; browser?: string; user?: { name?: string; image?: string } },
      { projectID: string }
    >
  ) {
    const {
      body: { sessionID, device, os, browser, user },
      headers: { projectID },
    } = req;
    const { mongo } = this.services;
    if (!mongo) throw new Error('mongo not initialized');

    const data = {
      projectID: new ObjectId(projectID),
      sessionID,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...(os && { os }),
      ...(device && { device }),
      ...(browser && { browser }),
      ...(user && {
        user: {
          ...(user.name && { name: user.name }),
          ...(user.image && { image: user.image }),
        },
      }),
      unread: true,
      reportTags: [],
    };

    const { value } = await mongo.db
      .collection('transcripts')
      .findOneAndUpdate(
        { projectID: data.projectID, sessionID: data.sessionID },
        { $set: data },
        { upsert: true, returnOriginal: false }
      );

    return value;
  }
}

export default PublicController;
