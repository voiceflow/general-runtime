import {
  APIHandler,
  CodeHandler,
  EndHandler,
  FlowHandler,
  GoToNodeHandler,
  IfHandler,
  IfV2Handler,
  IntegrationsHandler,
  NextHandler,
  RandomHandler,
  ResetHandler,
  SetHandler,
  SetV2Handler,
  StartHandler,
} from '@/runtime';
import { Config } from '@/types';

import _V1Handler from './_v1';
import CaptureHandler from './capture';
import CaptureV2Handler from './captureV2';
import CarouselHandler from './carousel';
import ChannelActionHandler from './channelAction';
import GoToHandler from './goTo';
import InteractionHandler from './interaction';
import SpeakHandler from './speak';
import StateHandlers from './state';
import StreamHandler from './stream';
import TextHandler from './text';
import VisualHandler from './visual';

const _v1Handler = _V1Handler();

export default ({
  API_REQUEST_TIMEOUT_MS,
  API_MAX_CONTENT_LENGTH_BYTES,
  API_MAX_BODY_LENGTH_BYTES,
  INTEGRATIONS_HANDLER_ENDPOINT,
  CODE_HANDLER_ENDPOINT,
}: Config) => [
  ...StateHandlers(),
  SpeakHandler(),
  GoToHandler(),
  ...InteractionHandler(),
  ...CaptureV2Handler(),
  ...CaptureHandler(),
  ResetHandler(),
  StreamHandler(),
  CodeHandler({ endpoint: CODE_HANDLER_ENDPOINT }),
  EndHandler(),
  FlowHandler(),
  IfHandler(),
  IfV2Handler({ _v1: _v1Handler }),
  APIHandler({
    requestTimeoutMs: API_REQUEST_TIMEOUT_MS ?? undefined,
    maxResponseBodySizeBytes: API_MAX_CONTENT_LENGTH_BYTES ?? undefined,
    maxRequestBodySizeBytes: API_MAX_BODY_LENGTH_BYTES ?? undefined,
  }),
  IntegrationsHandler({ integrationsEndpoint: INTEGRATIONS_HANDLER_ENDPOINT }),
  RandomHandler(),
  SetHandler(),
  SetV2Handler(),
  StartHandler(),
  VisualHandler(),
  TextHandler(),
  CarouselHandler(),
  GoToNodeHandler(),
  ChannelActionHandler(),

  /* add new handlers before NextHandler.
    Whenever there is a nextId in the step, next handler will be taken as the handler,
    unless the correct handler was found before it in this list.
  */
  NextHandler(),
  _v1Handler,
];
