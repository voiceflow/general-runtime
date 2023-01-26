import { ObjectField } from '@/lib/controllers/schemaTypes';

import { ConfigSchema } from '../stateManagement/requests';

export const PublicInteractSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    action: ObjectField('action'),
    config: ConfigSchema,
  },
};
