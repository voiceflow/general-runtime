import _ from 'lodash';
import workerpool from 'workerpool';

const evalExpression = async (expression: string, variables: Record<string, any> = {}) => {
  const exp = expression.split('\n') as any;

  // start js script as dedicated worker
  const mathJsWorkerPool = workerpool.pool(`${__dirname}/mathJsWorker.js`, { maxWorkers: 1 });
  // evaluate expressions in a separate worker to prevent memory overflow of main thread
  const result = await mathJsWorkerPool.exec('evaluate', [exp, variables]).timeout(1000);
  await mathJsWorkerPool.terminate();

  return result;
};

class Stack {
  public data: Array<string> = [];

  public push(element: string) {
    this.data.push(element);
  }

  public pop() {
    return this.data.pop();
  }

  public peek() {
    return this.data[this.data.length - 1];
  }

  public length() {
    return this.data.length;
  }
}

const operatorAttributes: Record<string, { prec: number; assoc: string }> = {
  '^': {
    prec: 4,
    assoc: 'R',
  },
  '*': {
    prec: 3,
    assoc: 'L',
  },
  '/': {
    prec: 3,
    assoc: 'L',
  },
  '+': {
    prec: 2,
    assoc: 'L',
  },
  '-': {
    prec: 2,
    assoc: 'L',
  },
  '!': {
    prec: 10,
    assoc: 'R',
  },
};

// perform operator on operands
const evaluate = (operand1: number, operand2: number, operator: string) => {
  let total = null;
  switch (operator) {
    case '+':
      total = operand1 + operand2;
      break;
    case '-':
      total = operand1 - operand2;
      break;
    case '*':
      total = operand1 * operand2;
      break;
    case '/':
      total = operand1 / operand2;
      break;
    case '==':
      // eslint-disable-next-line eqeqeq
      total = operand1 == operand2;
      break;
    case '||':
      total = operand1 || operand2;
      break;
    case '&&':
      total = operand1 && operand2;
      break;
    case '^':
      total = operand1 ** operand2;
      break;
    case '>':
      total = operand1 > operand2;
      break;
    case '<':
      total = operand1 < operand2;
      break;
    case '<=':
      total = operand1 <= operand2;
      break;
    case '>=':
      total = operand1 >= operand2;
      break;
    case '!=':
      // eslint-disable-next-line eqeqeq
      total = operand1 != operand2;
      break;
    case '!':
      total = !operand2;
      break;
    default:
      total = null;
  }
  return total;
};

// finds the solution to mathematical expressions in postfix notation
const evaluatePostfix = (postfixExpression: Array<string>) => {
  try {
    const tokenStack = new Stack();
    // eslint-disable-next-line no-restricted-syntax
    for (const i in postfixExpression) {
      if (typeof postfixExpression[i] === 'string' && postfixExpression[i].match(/^(\+|-|\*|\/|\^|==|&&|\|\||>|>=|<|<=|!|!=)$/)) {
        // postfixExpression is an operator

        const operand2 = tokenStack.pop();
        // If operator is !(not), there is no operand1
        const operand1: null | undefined | string = postfixExpression[i] === '!' ? null : tokenStack.pop();

        const result = evaluate(operand1 as any, operand2 as any, postfixExpression[i]) as any;
        tokenStack.push(result);
      } else {
        // postfixExpression is an operand
        tokenStack.push(postfixExpression[i]);
      }
    }

    if (tokenStack.length() > 1) {
      throw new Error('Invalid expression');
    }

    return tokenStack.pop();
  } catch (err) {
    throw new Error('Malformed expression');
  }
};

// Pops from the stack until the condition returns false
const popOpStackUntil = (
  RPN: Array<string | number>,
  operatorStack: Stack,
  addToRPN: boolean,
  condition: (operator: string) => boolean | RegExpMatchArray,
  isRightBracket = false
) => {
  let topOp = operatorStack.peek();
  let poppedCount = 0;

  while (condition(topOp)) {
    poppedCount++;
    if (addToRPN) {
      RPN.push(operatorStack.pop() as any);
    } else {
      operatorStack.pop();
      break;
    }
    topOp = operatorStack.peek();
  }

  if (poppedCount === 0 && isRightBracket) {
    throw new Error('Unbalanced parentheses');
  }
};

// shunting-yard algorithm parses mathematical expressions specified in infix notation
// it returns a postfix notation string
const shuntingYard = async (expression: string, variables: Record<string, any>): Promise<Array<string>> => {
  const RPN = [];
  const operatorStack = new Stack();

  let i = 0;
  while (i < expression.length) {
    const currToken = expression[i];
    if (currToken.match(/[0-9]/) || (currToken === '-' && expression[i + 1] && expression[i + 1].match(/[0-9]/))) {
      // Matched a number
      let num = '';
      let dotCount = 0;

      if (currToken === '-') {
        num += '-';
        i++;
      }

      // Get all the digits, even if float
      while (i < expression.length && expression[i].match(/^([0-9]|\.)$/)) {
        num += expression[i];
        i++;

        // eslint-disable-next-line max-depth
        if (expression[i] === '.') dotCount++;
      }

      // Can only have one decimal
      if (dotCount > 1) {
        throw new Error('can only have one decimal');
      }

      RPN.push(parseFloat(num));
      i--;
    } else if (currToken.match(/^(=|>|<|&|\|)$/)) {
      // Matched a function/special operator
      if (currToken === '|' || currToken === '&' || currToken === '=') {
        // Peek ahead and check for validity
        // eslint-disable-next-line max-depth
        if (expression[i + 1] === currToken) {
          // operators ||, &&, ==
          operatorStack.push(`${currToken}${currToken}`);
          i++;
        } else {
          throw new Error('peek ahead not valid');
        }
      } else if (currToken === '>' && expression[i + 1] === '=') {
        operatorStack.push('>=');
        i++;
      } else if (currToken === '<' && expression[i + 1] === '=') {
        operatorStack.push('<=');
        i++;
      } else {
        operatorStack.push(currToken);
      }
    } else if (currToken === '(') {
      // Matched a left bracket
      operatorStack.push(currToken);
    } else if (currToken === ')') {
      // Matched a right bracket, pop until hit left bracket
      popOpStackUntil(
        RPN,
        operatorStack,
        true,
        (topOp) => {
          return topOp !== '(';
        },
        true
      );

      // Pop all left brackets
      popOpStackUntil(
        RPN,
        operatorStack,
        false,
        (topOp) => {
          return topOp === '(';
        },
        true
      );
    } else if (currToken.match(/^(\+|-|\*|\/|\^|!)$/)) {
      // Special case: check for !=
      if (currToken === '!' && expression[i + 1] === '=') {
        operatorStack.push('!=');
        i++;
      } else {
        // Matched an operator, pop based on shunting yard rules
        popOpStackUntil(RPN, operatorStack, true, (topOp) => {
          return (
            !!topOp &&
            topOp !== '(' &&
            (topOp.match(/^(==|>|>=|<|<=|!=|&&|\|\|)$/) ||
              operatorAttributes[topOp].prec > operatorAttributes[currToken].prec ||
              (operatorAttributes[topOp].prec === operatorAttributes[currToken].prec && operatorAttributes[topOp].assoc === 'L'))
          );
        });
        operatorStack.push(currToken);
      }
    } else if (currToken === "'") {
      // Parse string out and put into RPN
      let stringVal = '';
      i++;
      while (i < expression.length) {
        if (expression[i] === "'" && (expression[i + 1] === undefined || expression[i + 1] === ')' || expression[i + 1] === ' ')) {
          break;
        }
        stringVal += expression[i];
        i++;
      }
      stringVal = stringVal.replace(/\\'/g, "'");

      RPN.push(stringVal);
    } else if (currToken === '$') {
      // Parse string out and put into RPN
      let stringVal = '';
      i++;
      while (i < expression.length) {
        if (expression[i] === '$' && (expression[i + 1] === undefined || expression[i + 1] === ')' || expression[i + 1] === ' ')) {
          break;
        }
        stringVal += expression[i];
        i++;
      }

      const scope = _.cloneDeep(variables);
      Object.defineProperty(scope, 'v', { writable: false });
      // user input in tool is 'expression' type. need to evaluate that with mathjs before pushing to RPN
      // eslint-disable-next-line no-await-in-loop
      RPN.push(await evalExpression(stringVal, scope));
    } else if (!!currToken && currToken !== ' ') {
      // Encountering a variable or truth literal
      let object = '';
      let variable = '';

      // Find the object it belong to
      while (expression[i].match(/^[a-z]|[0-9]|_$/)) {
        object += expression[i];
        i++;
      }

      if (object === 'false') {
        RPN.push(false);
      } else if (object === 'true') {
        RPN.push(true);
      } else {
        // Find the variable it's referencing within that object
        const varMatch = expression.substring(i).match(/\['.*?'\]/);
        if (varMatch && varMatch.index === 0) {
          variable = varMatch[0].substring(2, varMatch[0].length - 2);
          i += varMatch[0].length;
        } else {
          throw new Error('var not found');
        }

        let val = variables[object][variable];
        val = Number.isNaN(Number(val)) ? val : Number(val);
        RPN.push(val);
        i--;
      }
    }
    i++;
  }

  let topOp = operatorStack.peek();
  while (topOp) {
    RPN.push(operatorStack.pop());
    topOp = operatorStack.peek();
  }

  popOpStackUntil(RPN, operatorStack, true, (op) => !!op);

  return RPN;
};

// eslint-disable-next-line import/prefer-default-export
export const evaluateExpression = async (expression: string | number, variables: Record<string, any>) => {
  try {
    const RPN = await shuntingYard(expression.toString(), variables);
    if (RPN.length === 0 && typeof expression === 'number') {
      return expression;
    }
    return evaluatePostfix(RPN);
  } catch (err) {
    return `Unable to calculate expression: ${err}`;
  }
};

export const regexExpression = (expression: string | number) => {
  if (_.isNumber(expression)) return expression;
  return expression.replace(/v\['([A-Za-z0-9_]{0,32})'\]/g, (_m, inner) => `{${inner}}`);
};
