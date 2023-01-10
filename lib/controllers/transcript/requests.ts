import { BooleanField, ObjectField, StringField } from '@/lib/controllers/schemaTypes';

export const UpsertTranscriptSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['sessionID'],
  properties: {
    sessionID: StringField('sessionID'),
    apiKey: StringField('apiKey'),
    os: StringField('os'),
    device: StringField('device'),
    browser: StringField('browser'),
    user: ObjectField('user'),
    unread: BooleanField('unread'),
  },
};
