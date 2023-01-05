import { DeepPartial } from '@voiceflow/common';
import { ObjectId } from 'mongodb';

import { AbstractManager } from '../utils';
import { TranscriptClientInfo, TranscriptUpdatePayload } from './types';

class TranscriptManager extends AbstractManager {
  async createTranscript(projectID: string, sessionID: string, clientInfo: DeepPartial<TranscriptClientInfo>) {
    const { mongo } = this.services;
    if (!mongo) throw new Error('mongo not initialized');

    const filter = {
      projectID: new ObjectId(projectID),
      sessionID,
    };

    const insertData = {
      ...filter,
      createdAt: new Date(),
      unread: true,
      reportTags: [],
    };

    const { os, device, browser, user } = clientInfo;

    const updateData: TranscriptUpdatePayload = {
      updatedAt: insertData.createdAt,
      ...(os && { os }),
      ...(device && { device }),
      ...(browser && { browser }),
      ...(user && {
        user: {
          ...(user.name && { name: user.name }),
          ...(user.image && { image: user.image }),
        },
      }),
    };

    const { value: newTranscript } = await mongo.db
      .collection('transcripts')
      .findOneAndUpdate(
        filter,
        { $set: updateData, $setOnInsert: insertData },
        { upsert: true, returnOriginal: false }
      );

    return newTranscript;
  }
}

export default TranscriptManager;
