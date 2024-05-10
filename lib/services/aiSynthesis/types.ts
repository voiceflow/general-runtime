import type { AIResponse } from '@/lib/services/runtime/handlers/utils/ai';
import type { KnowledgeBaseFaqSet, KnowledgeBaseResponse } from '@/lib/services/runtime/handlers/utils/knowledgeBase';

export type KBResponse = AIResponse & Partial<KnowledgeBaseResponse> & { faqSet?: KnowledgeBaseFaqSet };
