import { BaseNode, BaseUtils } from '@voiceflow/base-types';
import { VoiceNode } from '@voiceflow/voice-types';

import { Message } from '@/lib/clients/ai/types';
import { HandlerFactory } from '@/runtime';

import { FrameType, Output } from '../types';
import { addOutputTrace, getOutputTrace } from '../utils';
import { fetchChat, fetchPrompt, getMemoryMessagesString } from './utils/ai';
import { fetchKnowledgeBase } from './utils/knowledgeBase';
import { generateOutput } from './utils/output';
import { getVersionDefaultVoice } from './utils/version';

const AIResponseHandler: HandlerFactory<VoiceNode.AIResponse.Node> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.AI_RESPONSE,
  handle: async (node, runtime, variables) => {
    const nextID = node.nextId ?? null;

    if (node.source === BaseUtils.ai.DATA_SOURCE.KNOWLEDGE_BASE) {
      const questionMessages: Message[] = [
        {
          role: 'user' as const,
          content: `Here is the conversation for reference:\n${getMemoryMessagesString(variables.getState())}\n\n${
            node.prompt
          }\n\nYou can search against a text knowledge base to answer the question, write a potential search sentence:`,
        },
      ];

      const query = await fetchChat(
        { messages: questionMessages, model: BaseUtils.ai.GPT_MODEL.GPT_3_5_turbo },
        variables.getState()
      );

      if (!query.output) return null;

      const data = await fetchKnowledgeBase(runtime.project!._id, query.output);

      if (!data) return null;

      const answerMessages = [
        {
          role: 'user' as const,
          content: `Here is the conversation for reference:\n${getMemoryMessagesString(
            variables.getState()
          )}\n\nwe looked up possible references for context in our knowledge base data sources:\n${data.chunks
            .map(({ content }) => content)
            .join('\n')}\n\n${node.prompt}`,
        },
      ];

      const answer = await fetchChat(
        {
          messages: answerMessages,
          model: BaseUtils.ai.GPT_MODEL.GPT_4,
        },
        variables.getState()
      );

      runtime.trace.addTrace({
        type: 'knowledgeBase',
        payload: {
          chunks: data.chunks.map(({ score, documentID }) => ({
            score,
            documentID,
            documentData: runtime.project?.knowledgeBase?.documents[documentID]?.data,
          })),
          query: query.output,
        },
      } as any);

      const output = generateOutput(
        answer!.output!,
        runtime.project,
        node.voice ?? getVersionDefaultVoice(runtime.version)
      );

      addOutputTrace(
        runtime,
        getOutputTrace({
          output,
          variables,
          version: runtime.version,
          ai: true,
        }),
        { variables }
      );

      return nextID;
    }

    const response = await fetchPrompt(node, variables.getState());

    if (!response.output) return nextID;

    const output = generateOutput(
      response.output,
      runtime.project,
      // use default voice if voice doesn't exist
      node.voice ?? getVersionDefaultVoice(runtime.version)
    );

    runtime.stack.top().storage.set<Output>(FrameType.OUTPUT, output);

    addOutputTrace(
      runtime,
      getOutputTrace({
        output,
        variables,
        version: runtime.version,
        ai: true,
      }),
      { variables }
    );

    return nextID;
  },
});

export default AIResponseHandler;
