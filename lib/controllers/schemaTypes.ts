export const BooleanField = (field: string) => ({
  type: 'boolean',
  description: `${field} must be an boolean and is required`,
});

export const StringField = (field: string) => ({
  type: 'string',
  description: `${field} must be a string and is required`,
});

export const ObjectField = (field: string) => ({
  type: 'object',
  description: `${field} must be an object and is required`,
});

export const RecordField = (field: string, type: any) => ({
  type: 'object',
  description: `${field} must be an object and is required`,
  patternProperties: {
    '^.*$': type,
  },
  additionalProperties: false,
});

export const ArrayField = (field: string, items: any) => ({
  type: 'array',
  description: `${field} must be an array and is required`,
  items,
});
