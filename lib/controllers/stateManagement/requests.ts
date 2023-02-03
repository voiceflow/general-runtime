import { ArrayField, BooleanField, ObjectField, StringField, StringOrNullField } from '@/lib/controllers/schemaTypes';

const StackFrame = {
  type: 'object',
  additionalProperties: true,
  required: ['programID'],
  properties: {
    nodeID: StringOrNullField('nodeID'),
    programID: StringField('programID'),
    storage: ObjectField('storage'),
    commands: ArrayField('commands', ObjectField('command')),
    variables: ObjectField('variables'),
  },
};

export const UpdateSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['stack', 'storage', 'variables'],
  properties: {
    stack: ArrayField('stack', StackFrame),
    storage: ObjectField('storage'),
    variables: ObjectField('variables'),
  },
};

export const ConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tts: BooleanField('tts'),
    stopAll: BooleanField('stopAll'),
    stripSSML: BooleanField('stripSSML'),
    stopTypes: ArrayField('stopTypes', StringField('stopType')),
    selfDelegate: BooleanField('selfDelegate'),
    excludeTypes: ArrayField('excludeTypes', StringField('excludeType')),
  },
};
