import { Config } from '@/types';

import { ClientMap } from '../clients';
import ASR from './asr';
import Chips from './chips';
import Dialog from './dialog';
import Filter from './filter';
import NLU from './nlu';
import RateLimit from './rateLimit';
import Runtime from './runtime';
import Slots from './slots';
import Speak from './speak';
import State from './state';
import TTS from './tts';

export interface ServiceMap {
  runtime: Runtime;
  state: State;
  asr: ASR;
  speak: Speak;
  nlu: NLU;
  dialog: Dialog;
  tts: TTS;
  chips: Chips;
  rateLimit: RateLimit;
  slots: Slots;
  filter: Filter;
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
  services.speak = new Speak(services, config);
  services.nlu = new NLU(services, config);
  services.tts = new TTS(services, config);
  services.dialog = new Dialog(services, config);
  services.chips = new Chips(services, config);
  services.rateLimit = new RateLimit(services, config);
  services.slots = new Slots(services, config);
  services.filter = new Filter(services, config);

  return services;
};

export default buildServices;
