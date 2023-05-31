import { StringField } from '@/lib/controllers/schemaTypes';

export const FeedbackSchema = {
  type: 'object',
  additionalProperties: true,
  required: ['name'],
  properties: {
    name: StringField('name'),
  },
};
