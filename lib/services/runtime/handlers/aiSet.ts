import { BaseNode } from '@voiceflow/base-types';
import { replaceVariables, sanitizeVariables } from '@voiceflow/common';
import axios from 'axios';

import Config from '@/config';
import log from '@/logger';
import { HandlerFactory } from '@/runtime';

const AISetHandler: HandlerFactory<BaseNode.AISet.Node> = () => ({
  canHandle: (node) => node.type === BaseNode.NodeType.AI_SET,
  handle: async (node, _, variables) => {
    const nextID = node.nextId ?? null;

    if (!Config.ML_GATEWAY_ENDPOINT) {
      log.error('ML_GATEWAY_ENDPOINT is not set, skipping generative node');
      return nextID;
    }

    if (!node.sets?.length) return nextID;

    const ML_GATEWAY_ENDPOINT = Config.ML_GATEWAY_ENDPOINT.split('/api')[0];
    const generativeEndpoint = `${ML_GATEWAY_ENDPOINT}/api/v1/generation/generative-response`;

    const sanitizedVars = sanitizeVariables(variables.getState());

    const { maxTokens, system, temperature, model } = node;

    await Promise.all(
      node.sets
        .filter((set) => !!set.prompt && !!set.variable)
        .map(async (set) => {
          variables.set(
            set.variable!,
            await axios
              .post<{ result: string }>(generativeEndpoint, {
                prompt: replaceVariables(set.prompt, sanitizedVars),
                maxTokens,
                system,
                temperature,
                model,
              })
              .then(({ data: { result } }) => result)
              .catch(() => null)
          );
        })
    );

    return nextID;
  },
});

export default AISetHandler;
