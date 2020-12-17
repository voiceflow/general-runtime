import { Config } from '@/types';

import { ClientMap } from '../clients';
import ASR from './asr';
import Dialog from './dialog';
import NLU from './nlu';
import Runtime from './runtime';
import State from './state';
import TTS from './tts';

export interface ServiceMap {
  runtime: Runtime;
  state: State;
  asr: ASR;
  nlu: NLU;
  dialog: Dialog;
  tts: TTS;
}

export interface FullServiceMap extends ClientMap, ServiceMap {}

/**
 * Build all services
 */
const buildServices = (config: Config, clients: ClientMap): FullServiceMap => {
  const services = {
    ...clients,
  } as FullServiceMap;

  services.runtime = new Runtime(services, config);
  services.state = new State(services, config);
  services.asr = new ASR(services, config);
  services.nlu = new NLU(services, config);
  services.tts = new TTS(services, config);
  services.dialog = new Dialog(services, config);

  return services;
};

export default buildServices;
