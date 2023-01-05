import { ObjectField, StringField } from '@/lib/controllers/schemaTypes';

export const TranscriptSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['sessionID'],
  properties: {
    sessionID: StringField('sessionID'),
    os: StringField('os'),
    device: StringField('device'),
    browser: StringField('browser'),
    user: ObjectField('user'),
  },
};
