import { FunctionCompiledVariableConfig, FunctionVariableType } from '@voiceflow/dtos';
import { z } from 'zod';

import { FunctionInputTypeException } from './exceptions/function-input-type.exception';
import { FunctionRequiredVarException } from './exceptions/function-required-var.exception';

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

export function validateInputVariableTypes(
  variables: Record<string, unknown>,
  typeDeclarations: Record<string, FunctionCompiledVariableConfig>
) {
  const firstInvalid = Object.entries(typeDeclarations).find(([varName, declare]) => {
    const validator = getZodValidator(declare.type);
    return !validator.safeParse(variables[varName]).success;
  });

  if (firstInvalid) {
    const [varName, declare] = firstInvalid;

    if (typeof variables[varName] === 'undefined') {
      throw new FunctionRequiredVarException(varName);
    } else {
      throw new FunctionInputTypeException(varName, declare.type, variables[varName]);
    }
  }
}
