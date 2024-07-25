import { createErrorRaiser } from '@/utils/logError/logError';

const MESSAGE_HANDLER_ERROR_TAG = 'capture-v3-handler';

export const raiseCaptureV3HandlerError = createErrorRaiser(MESSAGE_HANDLER_ERROR_TAG);
