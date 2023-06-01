import { BaseNode } from '@voiceflow/base-types';
import { match } from 'ts-pattern';

import { StreamAction } from '../../types';

export const mapStreamActions = (action: StreamAction) => {
  return match(action)
    .with(StreamAction.START, StreamAction.RESUME, () => BaseNode.Stream.TraceStreamAction.PLAY)
    .with(StreamAction.LOOP, () => BaseNode.Stream.TraceStreamAction.LOOP)
    .with(StreamAction.END, () => BaseNode.Stream.TraceStreamAction.END)
    .with(StreamAction.PAUSE, () => BaseNode.Stream.TraceStreamAction.PAUSE)
    .otherwise(() => null);
};
