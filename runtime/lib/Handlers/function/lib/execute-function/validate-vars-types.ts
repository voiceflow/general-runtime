import { FunctionCompiledVariableConfig, FunctionVariableKind, FunctionVariableType } from '@voiceflow/dtos';
import { z } from 'zod';

import { FunctionTypeException } from './exceptions/function-type.exception';

function getZodValidator(type: FunctionVariableType) {
  switch (type) {
    case FunctionVariableType.STRING:
      return z.string();
    case FunctionVariableType.NUMBER:
      return z.number();
    case FunctionVariableType.BOOLEAN:
      return z.boolean();
    case FunctionVariableType.OBJECT:
      return z.record(z.any());
    case FunctionVariableType.ARRAY:
      return z.array(z.any());
    default:
      throw new Error('Unexpected function variable type');
  }
}

export function validateVariableTypes(
  variables: Record<string, unknown>,
  typeDeclarations: Record<string, FunctionCompiledVariableConfig>,
  variableKind: FunctionVariableKind
) {
  const firstInvalid = Object.entries(typeDeclarations).find(([varName, declare]) => {
    const validator = getZodValidator(declare.type);
    return validator.safeParse(variables[varName]).success;
  });

  if (firstInvalid) {
    const [varName, declare] = firstInvalid;

    throw new FunctionTypeException(varName, declare.type, typeof variables[varName], variableKind);
  }
}
