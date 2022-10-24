import { ObjectField, StringField } from '@/lib/controllers/schemaTypes';

import { ConfigSchema } from '../stateManagement/requests';

export const PublicInteractSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    action: ObjectField('action'),
    config: ConfigSchema,
  },
};

export const TranscriptSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['sessionID'],
  properties: {
    sessionID: StringField('sessionID'),
    os: StringField('os'),
    device: StringField('device'),
    browser: StringField('browser'),
  },
};
