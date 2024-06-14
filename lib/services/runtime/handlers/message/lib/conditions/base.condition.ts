import { AnyCompiledCondition } from '@voiceflow/dtos';

import { Runtime, Store } from '@/runtime';

export abstract class BaseCondition<Condition extends AnyCompiledCondition = AnyCompiledCondition> {
  constructor(
    protected readonly condition: Condition,
    protected readonly runtime: Runtime,
    protected readonly variable: Store
  ) {}

  abstract evaluate(): Promise<boolean> | boolean;
}
