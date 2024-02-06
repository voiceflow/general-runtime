import cuid from 'cuid';

import Config from '@/config';
import { FunctionLambdaClient } from '@/runtime/lib/HTTPClient/function-lambda/function-lambda-client';

import { ExecuteFunctionArgs } from './execute-function.interface';
import { adaptTrace } from './lib/adapt-trace';
import { validateNext } from './lib/validate-next';
import { validateVariableValueTypes } from './lib/validate-variable-value-types';

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
    requestId: cuid.slug(),
  });

  if (next) {
    validateNext(next, definition.pathCodes);
  }

  return {
    next,
    outputVars,
    trace: trace?.map((tr) => adaptTrace(tr)),
  };
}
