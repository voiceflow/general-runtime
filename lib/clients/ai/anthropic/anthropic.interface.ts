import { Config } from '@/types';

export type AnthropicConfig = Pick<Config, 'AI_GENERATION_TIMEOUT' | 'ANTHROPIC_API_KEY'>;
