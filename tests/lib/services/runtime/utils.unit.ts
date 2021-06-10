import { TraceType } from '@voiceflow/general-types';
import { expect } from 'chai';
import sinon from 'sinon';

import { TurnType } from '@/lib/services/runtime/types';
import { addButtonsIfExists, addRepromptIfExists, getReadableConfidence } from '@/lib/services/runtime/utils';

describe('runtime utils service unit tests', () => {
  describe('addRepromptIfExists', () => {
    it('does not have repropmt', () => {
      const runtime = { turn: { set: sinon.stub() } };
      addRepromptIfExists({ foo: 'bar' } as any, runtime as any, null as any);

      expect(runtime.turn.set.callCount).to.eql(0);
    });

    it('has reprompt', () => {
      const runtime = { turn: { set: sinon.stub() } };
      const node = { reprompt: 'hello {var}' };
      const varState = { var: 'there' };
      const variables = { getState: sinon.stub().returns(varState) };

      addRepromptIfExists(node, runtime as any, variables as any);

      expect(runtime.turn.set.args[0]).to.eql([TurnType.REPROMPT, 'hello there']);
    });
  });

  describe('getReadableConfidence', () => {
    it('works', () => {
      expect(getReadableConfidence()).to.eql('100.00');
      expect(getReadableConfidence(0.567246)).to.eql('56.72');
    });
  });

  describe('addButtonsIfExists', () => {
    it('no buttons and chips', () => {
      const addTrace = sinon.stub();

      addButtonsIfExists({} as any, { trace: { addTrace } } as any, null as any);
      addButtonsIfExists({ chips: [] } as any, { trace: { addTrace } } as any, null as any);
      addButtonsIfExists({ buttons: [] } as any, { trace: { addTrace } } as any, null as any);
      addButtonsIfExists({ chips: [], buttons: [] } as any, { trace: { addTrace } } as any, null as any);

      expect(addTrace.callCount).to.eql(0);
    });

    it('with chips', () => {
      const node = { chips: [{ label: 'l1' }, { label: 'l2' }] };
      const runtime = { trace: { addTrace: sinon.stub() } };
      const variables = { getState: sinon.stub().returns({}) };

      addButtonsIfExists(node as any, runtime as any, variables as any);

      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: TraceType.CHOICE,
            payload: {
              buttons: [
                { name: 'l1', request: { type: 'text', payload: 'l1' } },
                { name: 'l2', request: { type: 'text', payload: 'l2' } },
              ],
            },
          },
        ],
      ]);
      expect(variables.getState.callCount).to.eql(2);
    });

    it('with buttons', () => {
      const node = {
        buttons: [
          { name: 'button {var1}', request: { type: 'intent', payload: { intent: { name: 'intent' }, query: 'button {var1}' } } },
          { name: 'button {var2} ', request: { type: 'text', payload: '{var2}' } },
        ],
      };
      const runtime = { trace: { addTrace: sinon.stub() } };
      const variables = { getState: sinon.stub().returns({ var1: 'value1', var2: 'value2' }) };

      addButtonsIfExists(node as any, runtime as any, variables as any);

      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: TraceType.CHOICE,
            payload: {
              buttons: [
                { name: 'button value1', request: { type: 'intent', payload: { intent: { name: 'intent' }, query: 'button value1' } } },
                { name: 'button value2 ', request: { type: 'text', payload: 'value2' } },
              ],
            },
          },
        ],
      ]);
      expect(variables.getState.callCount).to.eql(4);
    });
  });
});
