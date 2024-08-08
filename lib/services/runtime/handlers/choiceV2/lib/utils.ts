import { createErrorRaiser } from '@/utils/logError/logError';

const CHOICE_V2_HANDLER_ERROR_TAG = 'choice-v2-handler';

export const raiseChoiceV2HandlerError = createErrorRaiser(CHOICE_V2_HANDLER_ERROR_TAG);
