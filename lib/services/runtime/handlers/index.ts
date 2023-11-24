import {
  CodeHandler,
  EndHandler,
  FlowHandler,
  FunctionHandler,
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
import AIResponseHandler from './aiResponse';
import AISetHandler from './aiSet';
import APIHandler from './api';
import CaptureHandler from './capture';
import CaptureV2Handler from './captureV2';
import CardV2Handler from './cardV2';
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

export default (config: Config) => [
  ...StateHandlers(),
  SpeakHandler(),
  ...GoToHandler(),
  ...InteractionHandler(),
  ...CaptureV2Handler(),
  CaptureHandler(),
  ResetHandler(),
  StreamHandler(),
  CodeHandler({ endpoint: config.CODE_HANDLER_ENDPOINT }),
  EndHandler(),
  FlowHandler(),
  FunctionHandler(),
  IfHandler(),
  IfV2Handler({ _v1: _v1Handler }),
  APIHandler(config),
  IntegrationsHandler({ integrationsEndpoint: config.INTEGRATIONS_HANDLER_ENDPOINT }),
  RandomHandler(),
  AISetHandler(),
  SetHandler(),
  SetV2Handler(),
  StartHandler(),
  VisualHandler(),
  TextHandler(),
  AIResponseHandler(),
  ...CardV2Handler(),
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
