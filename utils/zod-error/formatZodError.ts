import { z } from 'zod';

const formatPath = (path: (string | number)[]) => path.join('.');

function formatZodIssue(zodIssue: z.ZodIssue) {
  const path = formatPath(zodIssue.path);
  switch (zodIssue.code) {
    case z.ZodIssueCode.invalid_type:
      return `Expected value of type '${zodIssue.expected}' for '${path}' but instead received '${zodIssue.received}'`;
    case z.ZodIssueCode.unrecognized_keys:
      if (path.length > 0) {
        return `Property '${path}' contains unrecognized properties '${zodIssue.keys.join(', ')}'`;
      }
      return `Unrecognized property '${zodIssue.keys.join(', ')}'`;
    case z.ZodIssueCode.invalid_literal:
      return `Received value '${zodIssue.received}' for '${path}' when literal value '${zodIssue.expected}' was expected`;
    case z.ZodIssueCode.invalid_enum_value:
      return `Property '${path}' expects the following enum values '${zodIssue.options.join(
        ', '
      )}'`;
    case z.ZodIssueCode.custom:
      return `Error at ${path}: ${zodIssue.message}`;
    default:
      return `Invalid object received`;
  }
}

export const formatZodError = (zodParsingError: z.ZodError) =>
  zodParsingError.issues.map(formatZodIssue).join('. ');
