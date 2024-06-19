import { AnyCompiledCondition } from '@voiceflow/dtos';
import noop from 'lodash/noop';

export type BaseConditionLogger = (message: string) => void;

export abstract class BaseCondition<Condition extends AnyCompiledCondition = AnyCompiledCondition> {
  constructor(
    protected readonly condition: Condition,
    protected readonly variables: Record<string, unknown>,
    protected readonly log: BaseConditionLogger = noop
  ) {}

  abstract evaluate(): Promise<boolean> | boolean;
}
