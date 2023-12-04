import { FunctionCompiledNode, FunctionCompiledVariableConfig, FunctionVariableType } from '@voiceflow/dtos';
import { z } from 'zod';

import { isNextPath, NextCommand } from '../../runtime-command/next-command.dto';
import { executeLambda } from '../execute-lambda/execute-lambda';
import { FunctionInputTypeException } from './exceptions/function-input-type.exception';
import { FunctionPathException } from './exceptions/function-path.exception';
import { FunctionRequiredVarException } from './exceptions/function-required-var.exception';

function validateNext(next: NextCommand, expectedPathCodes: Array<string>) {
  if (isNextPath(next) && !expectedPathCodes.includes(next.path)) {
    throw new FunctionPathException(next.path, expectedPathCodes);
  }
}

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

function validateInputVariableTypes(
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

export async function executeFunction(funcData: FunctionCompiledNode['data']) {
  const {
    functionDefinition: { code, inputVars: inputVarDeclr, pathCodes },
    inputMapping,
  } = funcData;

  validateInputVariableTypes(inputMapping, inputVarDeclr);

  const { next, outputVars, trace } = await executeLambda(code, inputMapping);

  if (next) {
    validateNext(next, pathCodes);
  }

  return {
    next,
    outputVars,
    trace,
  };
}
