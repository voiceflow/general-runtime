import { all, create } from 'mathjs';
import workerpool from 'workerpool';

const math = create(all, {});
const limitedEvaluate = math.evaluate;

math.import!(
  {
    // disable possible vulnerable functions
    import: () => {
      throw new Error('Function import is disabled');
    },
    createUnit: () => {
      throw new Error('Function createUnit is disabled');
    },
    evaluate: () => {
      throw new Error('Function evaluate is disabled');
    },
    parse: () => {
      throw new Error('Function parse is disabled');
    },
    simplify: () => {
      throw new Error('Function simplify is disabled');
    },
    derivative: () => {
      throw new Error('Function derivative is disabled');
    },
    // end of security fix

    // override native methods
    add: (x: any, y: any) => x + y,
    subtract: (x: any, y: any) => x - y,
    multiply: (x: any, y: any) => x * y,
    divide: (x: any, y: any) => x / y,

    equal: (x: any, y: any) => x == y, // eslint-disable-line eqeqeq
    or: (x: any, y: any) => x || y,
    and: (x: any, y: any) => x && y,
    not: (x: any) => !x,

    pow: (x: any, y: any) => x ** y,
    compare: (x: any, y: any) => {
      // eslint-disable-next-line eqeqeq
      if (x == y) {
        return 0;
      }
      if (x > y) {
        return 1;
      }

      return -1;
    },
  },
  { override: true }
);

const evaluate = (expressions: string, variables: Record<string, any>) => {
  try {
    return limitedEvaluate!(expressions, variables).pop();
  } catch (e) {
    return `__ERROR__:${e.message}`;
  }
};

// create a worker and register public functions
workerpool.worker({
  evaluate,
});
