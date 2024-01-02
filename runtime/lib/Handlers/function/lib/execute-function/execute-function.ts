import { FunctionCompiledVariableDeclaration, FunctionVariableType } from '@voiceflow/dtos';
import { z } from 'zod';

import Config from '@/config';
import { FunctionLambdaClient } from '@/runtime/lib/HTTPClient/function-lambda/function-lambda-client';

import { isNextPath, NextCommand } from '../../runtime-command/next-command.dto';
import { FunctionInputTypeException } from './exceptions/function-input-type.exception';
import { FunctionPathException } from './exceptions/function-path.exception';
import { FunctionRequiredVarException } from './exceptions/function-required-var.exception';
import { ExecuteFunctionArgs } from './execute-function.interface';

function validateNext(next: NextCommand, expectedPathCodes: Array<string>) {
  if (isNextPath(next) && !expectedPathCodes.includes(next.path)) {
    throw new FunctionPathException(next.path, expectedPathCodes);
  }
}

const variableTypeValidators = new Map<FunctionVariableType, z.ZodType>([
  [FunctionVariableType.STRING, z.string()],
  [FunctionVariableType.NUMBER, z.number()],
  [FunctionVariableType.BOOLEAN, z.boolean()],
  [FunctionVariableType.OBJECT, z.record(z.any())],
  [FunctionVariableType.ARRAY, z.array(z.any())],
]);

function getZodValidator(type: FunctionVariableType) {
  const validator = variableTypeValidators.get(type)!;

  if (!validator) {
    throw new Error(`Unexpected function variable type '${type}'`);
  }

  return validator;
}

function validateVariableValueTypes(
  declarations: Record<string, FunctionCompiledVariableDeclaration>,
  variableValues: Record<string, unknown>
) {
  const firstInvalid = Object.entries(declarations).find(([varName, declare]) => {
    const validator = getZodValidator(declare.type);
    return !validator.safeParse(variableValues[varName]).success;
  });

  if (firstInvalid) {
    const [varName, declare] = firstInvalid;

    if (typeof variableValues[varName] === 'undefined') {
      throw new FunctionRequiredVarException(varName);
    } else {
      throw new FunctionInputTypeException(varName, declare.type, variableValues[varName]);
    }
  }
}

export async function executeFunction(funcData: ExecuteFunctionArgs) {
  const { source, definition, invocation } = funcData;

  validateVariableValueTypes(definition.inputVars, invocation.inputVars);

  const functionLambdaClient = new FunctionLambdaClient({
    functionLambdaARN: Config.FUNCTION_LAMBDA_ARN,
    accessKeyId: Config.FUNCTION_LAMBDA_ACCESS_KEY_ID,
    secretAccessKey: Config.FUNCTION_LAMBDA_SECRET_ACCESS_KEY,
    region: Config.AWS_REGION,
  });

  const { next, outputVars, trace } = await functionLambdaClient.executeLambda({
    ...source,
    variables: invocation.inputVars,
  });

  if (next) {
    validateNext(next, definition.pathCodes);
  }

  return {
    next,
    outputVars,
    trace,
  };
}
