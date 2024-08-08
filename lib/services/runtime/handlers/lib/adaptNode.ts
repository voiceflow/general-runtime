import { BaseNode, BaseRequest } from '@voiceflow/base-types';
import { NodeType, WithCompiledButtonsDTO, WithCompiledNoMatchDTO, WithCompiledNoReplyDTO } from '@voiceflow/dtos';
import { VoiceflowNode } from '@voiceflow/voiceflow-types';

import { Runtime } from '@/runtime';
import { ErrorRaiser } from '@/utils/logError/logError';

import { getMessageText } from '../../utils/cms/message';

interface BaseNodeV2 {
  id: string;
  type: NodeType | BaseNode.NodeType;
  data: unknown;
  fallback: unknown;
}

type AdaptedNode = VoiceflowNode.Utils.NoReplyNode &
  VoiceflowNode.Utils.NoMatchNode &
  BaseRequest.NodeButton & {
    type: BaseNode.NodeType | NodeType;
  };

export function adaptNodeToV1(node: BaseNodeV2, runtime: Runtime, raiseError: ErrorRaiser = Error) {
  let adaptedNode: AdaptedNode = {
    id: node.id,
    type: node.type,
  };

  const parsedNoReply = WithCompiledNoReplyDTO.safeParse(node.fallback);
  if (parsedNoReply.success) {
    const fallbackData = parsedNoReply.data;

    if (fallbackData.noReply?.responseID) {
      const prompts = getMessageText(runtime, fallbackData.noReply.responseID, raiseError);

      adaptedNode = {
        ...adaptedNode,
        noReply: {
          prompts,
          timeout: fallbackData.noReply.inactivityTimeSec,
          randomize: true,
          nodeID: fallbackData.noReply.nextStepID,
        },
      };
    }
  }

  const parsedNoMatch = WithCompiledNoMatchDTO.safeParse(node.fallback);
  if (parsedNoMatch.success) {
    const fallbackData = parsedNoMatch.data;

    if (fallbackData.noMatch?.responseID) {
      const prompts = getMessageText(runtime, fallbackData.noMatch.responseID, raiseError);

      adaptedNode = {
        ...adaptedNode,
        noMatch: {
          prompts,
          randomize: true,
          nodeID: fallbackData.noMatch.nextStepID,
        },
      };
    }
  }

  const parsedButtons = WithCompiledButtonsDTO.safeParse(node.data);
  if (parsedButtons.success) {
    const buttonsData = parsedButtons.data;

    adaptedNode = {
      ...adaptedNode,
      buttons: buttonsData.buttons.map((button) => button as BaseRequest.AnyRequestButton),
    };
  }

  return adaptedNode;
}
