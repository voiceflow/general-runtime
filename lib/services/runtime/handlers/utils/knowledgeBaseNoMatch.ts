import { HTTP_STATUS } from '@voiceflow/verror';
import axios from 'axios';

import Config from '@/config';
import AIAssist from '@/lib/services/aiAssist';
import log from '@/logger';
import { Runtime } from '@/runtime';

import { Output } from '../../types';
import { generateOutput } from './output';

export const knowledgeBaseNoMatch = async (runtime: Runtime): Promise<Output | null> => {
  if (!Config.KNOWLEDGE_BASE_LAMBDA_ENDPOINT) {
    log.error('[knowledgeBase] KNOWLEDGE_BASE_LAMBDA_ENDPOINT is not set');
    return null;
  }

  const { KNOWLEDGE_BASE_LAMBDA_ENDPOINT } = Config;
  const answerEndpoint = `${KNOWLEDGE_BASE_LAMBDA_ENDPOINT}/answer`;

  const inputUtterance = AIAssist.getInput(runtime.getRequest());
  if (!inputUtterance) return null;

  try {
    const response = await axios.post(answerEndpoint, {
      projectID: runtime.project?._id,
      question: inputUtterance,
      settings: runtime.project?.knowledgeBase?.settings,
    });

    if (!response?.data) return null;

    return generateOutput(response.data.llmResponse, runtime.project);
  } catch (err) {
    if (err.response.status !== HTTP_STATUS.NOT_FOUND) {
      log.error(`[knowledgeBase] ${log.vars({ err })}`);
    }
    return null;
  }
};
