import axios from 'axios';

import Config from '@/config';
import AIAssist, { AIAssistLog } from '@/lib/services/aiAssist';
import log from '@/logger';
import { Runtime } from '@/runtime';

import { Output } from '../../types';
import { generateOutput } from './output';

export const generateNoMatch = async (runtime: Runtime): Promise<Output | null> => {
  if (!Config.ML_GATEWAY_ENDPOINT) {
    log.error('ML_GATEWAY_ENDPOINT is not set, skipping generative NoMatch');
    return null;
  }

  const ML_GATEWAY_ENDPOINT = Config.ML_GATEWAY_ENDPOINT.split('/api')[0];
  const autoCompleteEndpoint = `${ML_GATEWAY_ENDPOINT}/api/v1/generation/autocomplete`;

  const aiAssistTranscript = runtime.variables.get<AIAssistLog>(AIAssist.StorageKey) || [];

  const parsedAiAssistTranscript = aiAssistTranscript.reduce((acc, { role, content }) => {
    if (role === 'user') acc += `P2: ${content}\n`;
    if (role === 'assistant') acc += `AI: ${content}\n`;
    return acc;
  }, '');

  if (!parsedAiAssistTranscript) return null;

  const response = await axios
    .post(autoCompleteEndpoint, {
      transcript: parsedAiAssistTranscript,
      locale: runtime.version?.prototype?.data.locales[0], // use nlu locale
    })
    .catch(() => null);

  if (!response?.data) return null;

  return generateOutput(response.data, runtime.project);
};
