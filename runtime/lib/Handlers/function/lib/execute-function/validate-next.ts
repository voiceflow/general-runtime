import { isNextPath, NextCommand } from '../../runtime-command/next-command.dto';
import { FunctionPathException } from './exceptions/function-path.exception';

export function validateNext(next: NextCommand, expectedPathCodes: Array<string>) {
  if (isNextPath(next) && !expectedPathCodes.includes(next.path)) {
    throw new FunctionPathException(next.path, expectedPathCodes);
  }
}
