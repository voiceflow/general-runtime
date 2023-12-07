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

function validateVariableTypes(
  variables: Record<string, unknown>,
  typeDeclarations: Record<string, FunctionCompiledVariableDeclaration>
) {
  const firstInvalid = Object.entries(typeDeclarations).find(([varName, declaration]) => {
    const validator = getZodValidator(declaration.type);
    return !validator.safeParse(variables[varName]).success;
  });

  if (firstInvalid) {
    const [varName, declaration] = firstInvalid;

    if (typeof variables[varName] === 'undefined') {
      throw new FunctionRequiredVarException(varName);
    } else {
      throw new FunctionInputTypeException(varName, declaration.type, variables[varName]);
    }
  }
}

export async function executeFunction(funcData: ExecuteFunctionArgs) {
  const {
    source,
    definition: { inputVars: inputVarDeclarations, pathCodes },
    invocation: { inputVars: inputMapping },
  } = funcData;

  validateVariableTypes(inputMapping, inputVarDeclarations);

  const functionLambdaClient = new FunctionLambdaClient({
    functionLambdaARN: Config.FUNCTION_LAMBDA_ARN,
    accessKeyId: Config.FUNCTION_LAMBDA_ACCESS_KEY_ID,
    secretAccessKey: Config.FUNCTION_LAMBDA_SECRET_ACCESS_KEY,
    region: Config.AWS_REGION
  });

  const { next, outputVars, trace } = await functionLambdaClient.executeLambda({
    ...source,
    variables: inputMapping,
  });

  if (next) {
    validateNext(next, pathCodes);
  }

  return {
    next,
    outputVars,
    trace,
  };
}
