import { ExpressionCondition as RawExpressionCondition } from '../../response.types';
import { VariableContext } from '../../variableContext/variableContext';
import { BaseCondition } from './base.condition';

export class ExpressionCondition extends BaseCondition {
  constructor(protected readonly rawCondition: RawExpressionCondition, varContext: VariableContext) {
    super(rawCondition, varContext);
  }

  evaluate(): boolean {
    return false;
  }
}
