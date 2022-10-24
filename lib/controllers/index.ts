import { routeWrapper } from '@/lib/utils';
import { Config, Controller } from '@/types';

import { FullServiceMap } from '../services';
import Interact from './interact';
import Public from './public';
import StateManagement from './stateManagement';

export interface ControllerMap {
  public: Public;
  interact: Interact;
  stateManagement: StateManagement;
}

export interface ControllerClass<T = Controller> {
  new (services: FullServiceMap, config: Config): T;
}

/**
 * Build all controllers
 */
const buildControllers = (services: FullServiceMap, config: Config) => {
  const controllers: ControllerMap = {
    public: new Public(services, config),
    interact: new Interact(services, config),
    stateManagement: new StateManagement(services, config),
  };

  // everything before this will be route-wrapped
  routeWrapper(controllers);

  return controllers;
};

export default buildControllers;
