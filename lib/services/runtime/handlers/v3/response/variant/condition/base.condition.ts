import { ResolvedCondition } from '../../response.types';
import { VariableContext } from '../../variableContext/variableContext';

export abstract class BaseCondition {
  protected constructor(
    protected readonly rawCondition: ResolvedCondition,
    protected readonly varContext: VariableContext
  ) {}

  public abstract evaluate(): boolean;
}
