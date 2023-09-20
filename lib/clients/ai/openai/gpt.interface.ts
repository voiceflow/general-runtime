import { Config } from '@/types';

interface AzureBasedGPTConfig extends Config {
  AZURE_ENDPOINT: string;
  AZURE_OPENAI_API_KEY: string;
  AZURE_GPT35_DEPLOYMENTS: string;
}

interface OpenAIGPTConfig extends Config {
  OPENAI_API_KEY: string;
}

export type OpenAIConfig = AzureBasedGPTConfig | OpenAIGPTConfig;

export const isAzureBasedGPTConfig = (config: Config): config is AzureBasedGPTConfig => {
  return (
    'AZURE_ENDPOINT' in config &&
    'AZURE_OPENAI_API_KEY' in config &&
    // eslint-disable-next-line no-secrets/no-secrets
    'AZURE_GPT35_DEPLOYMENTS' in config &&
    !!config.AZURE_ENDPOINT &&
    !!config.AZURE_OPENAI_API_KEY &&
    !!config.AZURE_GPT35_DEPLOYMENTS
  );
};

export const isOpenAIGPTConfig = (config: Config): config is OpenAIGPTConfig => {
  return 'OPENAI_API_KEY' in config && !!config.OPENAI_API_KEY;
};
