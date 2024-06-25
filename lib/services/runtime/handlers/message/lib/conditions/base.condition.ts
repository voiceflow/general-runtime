import { AnyCompiledCondition } from '@voiceflow/dtos';
import noop from 'lodash/noop';

import MLGateway from '@/lib/clients/ml-gateway';

export type BaseConditionLogger = (message: string) => void;

export interface ConditionServices {
  mlGateway: MLGateway;
}

export abstract class BaseCondition<Condition extends AnyCompiledCondition = AnyCompiledCondition> {
  constructor(
    protected readonly condition: Condition,
    protected readonly variables: Record<string, unknown>,
    protected readonly services: ConditionServices,
    protected readonly log: BaseConditionLogger = noop
  ) {}

  abstract evaluate(): Promise<boolean> | boolean;
}
