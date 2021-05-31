import { Command } from '@voiceflow/api-sdk';

import Stack from '@/runtime/lib/Runtime/Stack';

export type CommandMatcher<C extends Command = Command> = (command: C, match?: any) => boolean;

// eslint-disable-next-line import/prefer-default-export
export const extractFrameCommand = <C extends Command = Command>(
  stack: Stack,
  matcher: CommandMatcher<C>,
  match?: any
): { index: number; command: C } | null => {
  const frames = stack.getFrames();
  // iterate from top forwards
  for (let index = frames.length - 1; index >= 0; index--) {
    const frame = frames[index];

    const matched = frame.getCommands().find((command) => matcher(command as C, match)) as C;

    if (matched) {
      return { index, command: matched };
    }
  }

  return null;
};
