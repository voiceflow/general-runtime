import { Enum } from '@/runtime/typings/enum';

const internalVarName = (name: string): string => `__vf__internal_${name}__`;

/**
 * NOTE: Internal variables should be prefixed with `__vf_internal_` and suffixed with `__` to
 * avoid name collisions with user-defined variables.
 */
export const InternalVariables = {
  FUNCTION_CONDITIONAL_TRANSFERS: internalVarName('function_conditional_transfers'),
};

export type InternalVariables = Enum<typeof InternalVariables>;
