import { ArrayField, ObjectField, StringField } from '@/lib/controllers/schemaTypes';

const StackFrame = {
  type: 'object',
  additionalProperties: true,
  required: ['programID'],
  properties: {
    nodeID: StringField('nodeID'),
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
