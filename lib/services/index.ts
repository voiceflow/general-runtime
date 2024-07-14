import { Config } from '@/types';

import { ClientMap } from '../clients';
import AIAssist from './aiAssist';
import AISynthesis from './aiSynthesis';
import Analytics from './analytics';
import ASR from './asr';
import Dialog from './dialog';
import Extraction from './extraction';
import Feedback from './feedback';
import Filter from './filter';
import Interact from './interact';
import MergeCompletion from './merge-completion';
import NLU from './nlu';
import Runtime from './runtime';
import { LocalSession, MongoSession, Session } from './session';
import { Source } from './session/constants';
import Speak from './speak';
import State from './state';
import StateManagement from './stateManagement';
import { TestService } from './test';
import Transcript from './transcript';
import TTS from './tts';

export interface ServiceMap {
  aiAssist: AIAssist;
  aiSynthesis: AISynthesis;
  analytics: Analytics;
  asr: ASR;
  dialog: Dialog;
  extraction: Extraction;
  feedback: Feedback;
  filter: Filter;
  interact: Interact;
  mergeCompletion: MergeCompletion;
  nlu: NLU;
  runtime: Runtime;
  session: Session;
  speak: Speak;
  state: State;
  stateManagement: StateManagement;
  test: TestService;
  transcript: Transcript;
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

  // order here matters, services defined after runtime are not available inside of it
  if (config.SESSIONS_SOURCE === Source.LOCAL) {
    services.session = new LocalSession(services, config);
  } else if (config.SESSIONS_SOURCE === Source.MONGO) {
    services.session = new MongoSession(services, config);
  }
  services.aiSynthesis = new AISynthesis(services, config);
  services.runtime = new Runtime(services, config);
  services.state = new State(services, config);
  services.asr = new ASR(services, config);
  services.speak = new Speak(services, config);
  services.nlu = new NLU(services, config);
  services.tts = new TTS(services, config);
  services.dialog = new Dialog(services, config);
  services.filter = new Filter(services, config);
  services.analytics = new Analytics(services, config);
  services.stateManagement = new StateManagement(services, config);
  services.test = new TestService(services, config);
  services.transcript = new Transcript(services, config);
  services.aiAssist = new AIAssist(services, config);
  services.mergeCompletion = new MergeCompletion(services, config);
  services.interact = new Interact(services, config);
  services.feedback = new Feedback(services, config);

  return services;
};

export default buildServices;
