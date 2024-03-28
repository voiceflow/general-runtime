import { NextCommand, NextPathDTO } from '../../../runtime-command/next-command.dto';
import { FunctionPathException } from '../exceptions/function-path.exception';

export function validateNext(next: NextCommand, expectedPathCodes: Array<string>) {
  const parsedNextPath = NextPathDTO.safeParse(next);
  if (parsedNextPath.success && !expectedPathCodes.includes(parsedNextPath.data.path)) {
    throw new FunctionPathException(parsedNextPath.data.path, expectedPathCodes);
  }
}
