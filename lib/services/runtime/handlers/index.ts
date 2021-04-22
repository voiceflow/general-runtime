import {
  APIHandler,
  CodeHandler,
  EndHandler,
  FlowHandler,
  IfHandler,
  IfV2Handler,
  IntegrationsHandler,
  NextHandler,
  RandomHandler,
  ResetHandler,
  SetHandler,
  SetV2Handler,
  StartHandler,
} from '@voiceflow/runtime';

import { Config } from '@/types';

import _V1Handler from './_v1';
import CaptureHandler from './capture';
import InteractionHandler from './interaction';
import SpeakHandler from './speak';
import StateHandlers from './state';
import StreamHandler from './stream';
import VisualHandler from './visual';

const _v1Handler = _V1Handler();

export default ({ API_HANDLER_ENDPOINT, INTEGRATIONS_HANDLER_ENDPOINT, CODE_HANDLER_ENDPOINT }: Config) => [
  ...StateHandlers(),
  SpeakHandler(),
  InteractionHandler(),
  CaptureHandler(),
  ResetHandler(),
  StreamHandler(),
  CodeHandler({ endpoint: CODE_HANDLER_ENDPOINT }),
  EndHandler(),
  FlowHandler(),
  IfHandler(),
  IfV2Handler({ _v1: _v1Handler }),
  APIHandler({ customAPIEndpoint: API_HANDLER_ENDPOINT }),
  IntegrationsHandler({ integrationsEndpoint: INTEGRATIONS_HANDLER_ENDPOINT }),
  RandomHandler(),
  SetHandler(),
  SetV2Handler(),
  StartHandler(),
  VisualHandler(),
  NextHandler(),
  _v1Handler,
];
