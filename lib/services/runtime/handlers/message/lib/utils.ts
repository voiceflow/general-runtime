import { createErrorRaiser } from '@/utils/logError/logError';

const MESSAGE_HANDLER_ERROR_TAG = 'message-handler';

export const raiseMessageHandlerError = createErrorRaiser(MESSAGE_HANDLER_ERROR_TAG);
