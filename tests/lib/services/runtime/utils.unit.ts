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
      expect(addButtonsIfExists({} as any, null as any, null as any)).to.eql(false);
      expect(addButtonsIfExists({ chips: [] } as any, null as any, null as any)).to.eql(false);
      expect(addButtonsIfExists({ buttons: [] } as any, null as any, null as any)).to.eql(false);
      expect(addButtonsIfExists({ chips: [], buttons: [] } as any, null as any, null as any)).to.eql(false);
    });

    it('with chips', () => {
      const node = { chips: [{ label: 'l1' }, { label: 'l2' }] };
      const runtime = { trace: { addTrace: sinon.stub() } };
      const variables = { getState: sinon.stub().returns({}) };

      expect(addButtonsIfExists(node as any, runtime as any, variables as any)).to.eql(true);
      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: TraceType.CHOICE,
            payload: { choices: [{ name: 'l1' }, { name: 'l2' }] },
          },
        ],
      ]);
      expect(variables.getState.callCount).to.eql(2);
    });

    it('with buttons', () => {
      const node = {
        buttons: [
          { name: 'l1', payload: { intentID: 'intent-1' } },
          { name: 'l2', payload: { intentID: 'intent-2' } },
        ],
      };
      const runtime = { trace: { addTrace: sinon.stub() } };
      const variables = { getState: sinon.stub().returns({}) };

      expect(addButtonsIfExists(node as any, runtime as any, variables as any)).to.eql(true);
      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: TraceType.CHOICE,
            payload: {
              choices: [
                { name: 'l1', intent: 'intent-1' },
                { name: 'l2', intent: 'intent-2' },
              ],
            },
          },
        ],
      ]);
      expect(variables.getState.callCount).to.eql(2);
    });
  });
});
