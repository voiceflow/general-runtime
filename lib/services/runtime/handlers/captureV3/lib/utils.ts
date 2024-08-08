import { createErrorRaiser } from '@/utils/logError/logError';

const CHOICE_V3_HANDLER_ERROR_TAG = 'capture-v3-handler';

export const raiseCaptureV3HandlerError = createErrorRaiser(CHOICE_V3_HANDLER_ERROR_TAG);
