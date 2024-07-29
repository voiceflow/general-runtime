import { expect } from 'chai';

import * as utils from '../../../../../runtime/lib/Handlers/code/utils';

const ENDPOINT = 'https://cjpsnfbb56.execute-api.us-east-1.amazonaws.com/dev/code/execute';
describe('JsExecute unit tests', () => {
  describe('remoteVMExecute', () => {
    it('works', async () => {
      const code = 'a = 5 * 3';
      const variableState: Record<string, any> = { a: 0 };
      const remoteVMVariableState = await utils.remoteVMExecute(ENDPOINT!, { code, variables: variableState });
      expect(remoteVMVariableState).to.eql({ a: 15 });
    });
  });
  describe('ivmExecute', () => {
    it('works', async () => {
      const code = 'a = 5 * 3';
      const variableState: Record<string, any> = { a: 0 };
      const remoteVMVariableState = await utils.ivmExecute({ code, variables: variableState });
      expect(remoteVMVariableState).to.eql({ a: 15 });
    });
  });
  describe('remoteVMExecute result comparison with ivmExecute', () => {
    it('should be the same', async () => {
      const code = 'a = 5 * 3';
      const variableState: Record<string, any> = { a: 0 };
      const remoteVMVariableState = await utils.remoteVMExecute(ENDPOINT!, { code, variables: variableState });
      const ivmExecuteVariableState = await utils.ivmExecute({ code, variables: variableState });
      expect(remoteVMVariableState).to.eql(ivmExecuteVariableState);
    });
  });
});
