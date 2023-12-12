import { DeepPartial } from '@voiceflow/common';
import { ObjectId } from 'mongodb';

import { AbstractManager } from '../utils';
import { TranscriptClientInfo, TranscriptUpdatePayload } from './types';

class TranscriptManager extends AbstractManager {
  async upsertTranscript(projectID: string, sessionID: string, clientInfo: DeepPartial<TranscriptClientInfo>) {
    const { mongo } = this.services;
    if (!mongo) throw new Error('mongo not initialized');

    const filter = {
      projectID: new ObjectId(projectID),
      sessionID,
    };

    const insertData = {
      ...filter,
      createdAt: new Date(),
      reportTags: [],
    };

    const { os, device, browser, user, unread } = clientInfo;

    const updateData: TranscriptUpdatePayload = {
      updatedAt: insertData.createdAt,
      ...(os && { os }),
      ...(device && { device }),
      ...(browser && { browser }),
      ...(unread && { unread }),
      ...(user && {
        user: {
          ...(user.name && { name: user.name }),
          ...(user.image && { image: user.image }),
        },
      }),
    };

    return mongo.db
      .collection<typeof insertData | typeof updateData>('transcripts')
      .findOneAndUpdate(
        filter,
        { $set: updateData, $setOnInsert: insertData },
        { upsert: true, returnDocument: 'after' }
      );
  }
}

export default TranscriptManager;
