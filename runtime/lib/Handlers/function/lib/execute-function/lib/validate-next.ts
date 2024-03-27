import { NextCommand, NextPathDTO } from '../../../runtime-command/next-command.dto';
import { FunctionPathException } from '../exceptions/function-path.exception';

export function validateNext(next: NextCommand, expectedPathCodes: Array<string>) {
  if (NextPathDTO.safeParse(next).success && !expectedPathCodes.includes(next.path)) {
    throw new FunctionPathException(next.path, expectedPathCodes);
  }
}
