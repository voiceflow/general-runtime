import { HTTP_STATUS } from '@voiceflow/verror';
import axios from 'axios';

import Config from '@/config';
import log from '@/logger';
import { Runtime } from '@/runtime';

import { Output } from '../../types';
import { generateOutput } from './output';

export const knowledgeBaseNoMatch = async (runtime: Runtime): Promise<Output | null> => {
  if (!Config.KNOWLEDGE_BASE_LAMBDA_ENDPOINT) {
    log.error('KNOWLEDGE_BASE_LAMBDA_ENDPOINT is not set, skipping knowledge base noMatch');
    return null;
  }

  const { KNOWLEDGE_BASE_LAMBDA_ENDPOINT } = Config;
  const answerEndpoint = `${KNOWLEDGE_BASE_LAMBDA_ENDPOINT}/answer`;

  const inputUtterance = runtime.getRequest().payload.query;

  try {
    const response = await axios.post(answerEndpoint, {
      projectID: runtime.project?._id,
      question: inputUtterance,
    });

    if (!response?.data) return null;

    return generateOutput(response.data.llmResponse, runtime.project);
    //   return generateOutput(response.data, runtime.project);
  } catch (err) {
    if (err.response.status === HTTP_STATUS.NOT_FOUND) return null;
    throw err;
  }
};
