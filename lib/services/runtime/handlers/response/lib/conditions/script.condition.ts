import { CompiledScriptCondition } from '@voiceflow/dtos';
import { NotImplementedException } from '@voiceflow/exception';

import { BaseCondition } from './base.condition';

export class ScriptCondition extends BaseCondition<CompiledScriptCondition> {
  private evaluateCode(_code: string): boolean {
    // 1 - Setup `isolated-vm` code execution sandbox
    // 2 - Evaluate the code and pull out the result
    // NOTE - Consider batching together code executions for a speed optimization, rather than incurring the
    //        cost of `isolated-vm` setup every single time.
    throw new NotImplementedException('expression condition is not implemented');
  }

  evaluate(): boolean {
    const result = this.evaluateCode(this.condition.data.code);

    this.runtime.trace.debug('--- evaluated script condition --- code = {}, result = {}');

    return result;
  }
}
