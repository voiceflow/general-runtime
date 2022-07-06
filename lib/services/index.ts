import { Config } from '@/types';

import { ClientMap } from '../clients';
import Analytics from './analytics';
import ASR from './asr';
import DebugLogging from './debugLogging';
import Dialog from './dialog';
import Filter from './filter';
import Interact from './interact';
import NLU from './nlu';
import Runtime from './runtime';
import { LocalSession, MongoSession, Session } from './session';
import { Source } from './session/constants';
import Slots from './slots';
import Speak from './speak';
import State from './state';
import StateManagement from './stateManagement';
import TTS from './tts';

export interface ServiceMap {
  runtime: Runtime;
  state: State;
  asr: ASR;
  speak: Speak;
  nlu: NLU;
  dialog: Dialog;
  tts: TTS;
  slots: Slots;
  filter: Filter;
  session: Session;
  interact: Interact;
  analytics: Analytics;
  stateManagement: StateManagement;
  debugLogging: DebugLogging;
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
  services.debugLogging = new DebugLogging(services, config);
  services.state = new State(services, config);
  services.asr = new ASR(services, config);
  services.speak = new Speak(services, config);
  services.nlu = new NLU(services, config);
  services.tts = new TTS(services, config);
  services.dialog = new Dialog(services, config);
  services.slots = new Slots(services, config);
  services.filter = new Filter(services, config);
  services.analytics = new Analytics(services, config);
  services.stateManagement = new StateManagement(services, config);
  services.interact = new Interact(services, config);

  if (config.SESSIONS_SOURCE === Source.LOCAL) {
    services.session = new LocalSession(services, config);
  } else if (config.SESSIONS_SOURCE === Source.MONGO) {
    services.session = new MongoSession(services, config);
  }

  return services;
};

export default buildServices;
