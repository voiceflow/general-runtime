/* eslint-disable import/prefer-default-export */
import { ArrayField, ObjectField, RecordField, StringField } from '@/lib/controllers/schemaTypes';

const StackFrame = {
  type: 'object',
  additionalProperties: false,
  required: ['programID', 'storage', 'variables'],
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
    turn: ObjectField('turn'),
    stack: ArrayField('stack', RecordField('stackFrame', StackFrame)),
    storage: ObjectField('storage'),
    variables: ObjectField('variables'),
  },
};
