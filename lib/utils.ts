import { ResponseBuilder, Validator } from '@voiceflow/backend-utils';
import Ajv from 'ajv';

import log from '@/logger';
import { AnyClass } from '@/types';

import { ControllerMap } from './controllers';
import { AbstractController } from './controllers/utils';
import { MiddlewareMap } from './middlewares';
import { AbstractMiddleware } from './middlewares/utils';

type Validations = Record<string, Validator.ValidationChain>;

export const validate =
  (validations: Validations) =>
  (_target: Record<string, any>, _key: string, descriptor: PropertyDescriptor) => {
    descriptor.value = Object.assign(descriptor.value, { validations });

    return descriptor;
  };

export const customAJV = (schema: Record<string, any>) => (value: any) => {
  const ajv = new Ajv({ useDefaults: true, allErrors: true, verbose: true });
  const valid = ajv.validate(schema, value);
  if (!valid) {
    const error = new Error(ajv.errorsText());
    log.error(`[http] [${customAJV.name}] validation error ${log.vars({ value, error })}`);

    throw error;
  }

  return true;
};

export const getInstanceMethodNames = (obj: AbstractMiddleware | AbstractController) => {
  const proto = Object.getPrototypeOf(obj);
  if (proto.constructor.name === 'Object') {
    return Object.getOwnPropertyNames(obj);
  }

  return Object.getOwnPropertyNames(proto).filter((name) => name !== 'constructor');
};

const responseBuilder = new ResponseBuilder();

export const routeWrapper = (routers: ControllerMap | MiddlewareMap) => {
  Object.values(routers).forEach((routes) => {
    getInstanceMethodNames(routes).forEach((route) => {
      if (typeof routes[route] === 'function' && !routes[route].route) {
        const routeHandler = routes[route].bind(routes);
        routeHandler.validations = routes[route].validations;
        routeHandler.callback = routes[route].callback;

        routes[route] = responseBuilder.route(routeHandler);
      }
    });
  });
};

export const isConstructor = <T extends AnyClass>(clazz: T | unknown): clazz is T => {
  try {
    // eslint-disable-next-line no-new
    new new Proxy(clazz as any, {
      construct: () => ({}),
    })();
    return true;
  } catch {
    return false;
  }
};
