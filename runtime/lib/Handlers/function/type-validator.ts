import { FunctionCompiledVariableConfig, FunctionVariableType } from '@voiceflow/dtos';
import { z } from 'zod';

import { TypeValidatorResult } from './type-validator.interface';

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
  typeDeclarations: Record<string, FunctionCompiledVariableConfig>
): TypeValidatorResult {
  const firstInvalid = Object.entries(typeDeclarations).find(([varName, declare]) => {
    const validator = getZodValidator(declare.type);
    return validator.safeParse(variables[varName]).success;
  });

  if (firstInvalid) {
    const [varName, declare] = firstInvalid;
    return {
      success: false,
      variable: varName,
      expectedType: declare.type,
    };
  }

  return {
    success: true,
  };
}
