import axios from 'axios';

import Config from '@/config';
import Transcript from '@/lib/services/transcript';
import { Runtime } from '@/runtime';

import { Output } from '../../types';
import { generateOutput } from './output';

export const generateNoMatch = async (runtime: Runtime): Promise<Output | null> => {
  if (!Config.ML_GATEWAY_ENDPOINT) return null;

  const ML_GATEWAY_ENDPOINT = Config.ML_GATEWAY_ENDPOINT.split('/api')[0];
  const autoCompleteEndpoint = `${ML_GATEWAY_ENDPOINT}/api/v1/generation/autocomplete`;

  const newInput = Transcript.getInput(runtime.getRequest());
  const storageTranscript = runtime.storage.get<[string | null, string | null][]>(Transcript.StorageKey) || [];
  const transcript = [...storageTranscript, [newInput, null]];

  const parsedTranscript = transcript.reduce((acc, [input, output]) => {
    if (input) acc += `P2: ${input}\n`;
    if (output) acc += `AI: ${output}\n`;
    return acc;
  }, '');

  if (!parsedTranscript) return null;

  const response = await axios
    .post(autoCompleteEndpoint, {
      transcript: parsedTranscript,
      locale: runtime.version?.prototype?.data.locales[0], // use nlu locale
    })
    .catch(() => null);

  if (!response?.data) return null;

  return generateOutput(response.data, runtime.project);
};
