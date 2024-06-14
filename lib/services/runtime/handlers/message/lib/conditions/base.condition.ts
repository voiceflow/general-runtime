import { AnyCompiledCondition } from '@voiceflow/dtos';

import { Runtime, Store } from '@/runtime';

import { ConditionResources } from './conditionResources';

export abstract class BaseCondition<Condition extends AnyCompiledCondition = AnyCompiledCondition> {
  constructor(
    protected readonly condition: Condition,
    protected readonly runtime: Runtime,
    protected readonly variables: Store,
    protected readonly resources: ConditionResources
  ) {}

  abstract evaluate(): Promise<boolean> | boolean;
}
