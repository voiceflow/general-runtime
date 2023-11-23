import { FunctionCompiledNode } from '@voiceflow/dtos';

import { executeLambda } from '../execute-lambda/execute-lambda';
import { validateInputVariableTypes } from './validate-input-variable-types';
import { validateNext } from './validate-next';

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
