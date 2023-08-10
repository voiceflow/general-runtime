import { AbstractManager } from '../utils';
import { FunctionRunner } from './test-runner/function.runner';

export class TestService extends AbstractManager {
  public async testFunction(functionID: string, inputMapping: Record<string, unknown>) {
    return FunctionRunner(functionID, inputMapping);
  }
}
