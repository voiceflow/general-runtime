import { sanitizeVariables } from '@voiceflow/common';
import { AnyCompiledCondition } from '@voiceflow/dtos';
import noop from 'lodash/noop';

export type BaseConditionLogger = (message: string) => void;

export abstract class BaseCondition<Condition extends AnyCompiledCondition = AnyCompiledCondition> {
  constructor(
    protected readonly condition: Condition,
    protected readonly variables: Record<string, unknown>,
    protected readonly emitTraceMessage: BaseConditionLogger = noop,
    protected readonly logError: BaseConditionLogger = noop
  ) {
    this.variables = sanitizeVariables(variables);
  }

  abstract evaluate(): Promise<boolean> | boolean;
}
