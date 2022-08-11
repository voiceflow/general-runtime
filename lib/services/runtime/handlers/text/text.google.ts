import { BaseNode } from '@voiceflow/base-types';
import { VoiceflowConstants } from '@voiceflow/voiceflow-types';
import _sample from 'lodash/sample';

import log from '@/logger';
import { HandlerFactory } from '@/runtime';
import { Frame, Storage } from '@/runtime/lib/constants/flags.google';

import { isGooglePlatform, processOutput } from '../../utils.google';

const handlerUtils = {
  _sample,
  processOutput,
};

export const TextHandler: HandlerFactory<BaseNode.Text.Node, typeof handlerUtils> = (utils) => ({
  canHandle: (node) =>
    node.type === BaseNode.NodeType.TEXT && isGooglePlatform(node.platform as VoiceflowConstants.PlatformType),
  handle: (node, runtime, variables) => {
    const text = utils._sample(node.texts);

    if (text) {
      try {
        const message = utils.processOutput(text.content, variables);

        if (typeof message === 'string') {
          runtime.storage.produce<{ [Storage.OUTPUT]: string }>((draft) => {
            draft[Storage.OUTPUT] += message;
          });

          // speak vs output?
          runtime.stack.top().storage.set(Frame.SPEAK, message);
          // TODO set this as a trace for adapter handling?
          // runtime.turn.set(Turn.DF_ES_TEXT_ENABLED, true);
        }
      } catch (error) {
        log.error(`[app] [${TextHandler.name}] failed to add Slate trace ${log.vars({ error })}`);
      }
    }

    return node.nextId ?? null;
  },
});

export default () => TextHandler(handlerUtils);
