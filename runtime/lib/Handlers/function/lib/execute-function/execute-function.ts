import { FunctionCompiledNode, FunctionVariableKind } from '@voiceflow/dtos';

import { executeLambda } from '../execute-lambda/execute-lambda';
// import { validateNext } from './validate-next';
import { validateVariableTypes } from './validate-vars-types';

export async function executeFunction(funcData: FunctionCompiledNode['data']) {
  const {
    functionDefn: { code, inputVars: inputVarDeclr, outputVars: outputVarDeclrs },
    inputMapping,
    // paths,
  } = funcData;

  validateVariableTypes(inputMapping, inputVarDeclr, FunctionVariableKind.INPUT);

  const { next, outputVars, trace } = await executeLambda(code, inputMapping);

  // $TODO$ - Validate path code
  // if (next) {
  //   validateNext(next, paths);
  // }

  if (outputVars) {
    validateVariableTypes(outputVars, outputVarDeclrs, FunctionVariableKind.OUTPUT);
  }

  return {
    next,
    outputVars,
    trace,
  };
}
