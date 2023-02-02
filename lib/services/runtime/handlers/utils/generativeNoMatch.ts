import axios from 'axios';

import Config from '@/config';
import AIAssist from '@/lib/services/aiAssist';
import { Runtime } from '@/runtime';

import { Output } from '../../types';
import { generateOutput } from './output';

export const generateNoMatch = async (runtime: Runtime): Promise<Output | null> => {
  if (!Config.ML_GATEWAY_ENDPOINT) return null;

  const ML_GATEWAY_ENDPOINT = Config.ML_GATEWAY_ENDPOINT.split('/api')[0];
  const autoCompleteEndpoint = `${ML_GATEWAY_ENDPOINT}/api/v1/generation/autocomplete`;

  const newInput = AIAssist.getInput(runtime.getRequest());
  const storageAIAssistTranscript = runtime.storage.get<[string | null, string | null][]>(AIAssist.StorageKey) || [];
  const aiAssistTranscript = [...storageAIAssistTranscript, [newInput, null]];

  const parsedAiAssistTranscript = aiAssistTranscript.reduce((acc, [input, output]) => {
    if (input) acc += `P2: ${input}\n`;
    if (output) acc += `AI: ${output}\n`;
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
