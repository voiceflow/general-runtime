import { FunctionCompiledNode } from '@voiceflow/dtos';

import { isNextPath, NextCommand } from '../../runtime-command/next-command/next-command.dto';
import { FunctionPathException } from './exceptions/function-path.exception';

export function validateNext(next: NextCommand, paths: FunctionCompiledNode['data']['paths']) {
  if (isNextPath(next)) {
    const expectedKeys = Object.keys(paths);
    if (!expectedKeys.includes(next.path)) {
      throw new FunctionPathException(next.path, expectedKeys);
    }
  }
}
