import { BaseNode } from '@voiceflow/base-types';
import { expect } from 'chai';
import sinon from 'sinon';

import {
  addButtonsIfExists,
  getReadableConfidence,
  isPromptContentEmpty,
  isPromptContentInitialized,
  mapEntities,
  slateInjectVariables,
  slateToPlaintext,
} from '@/lib/services/runtime/utils';

describe('runtime utils service unit tests', () => {
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
            type: BaseNode.Utils.TraceType.CHOICE,
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
          {
            name: 'button {var1}',
            request: { type: 'intent', payload: { intent: { name: 'intent' }, query: 'button {var1}' } },
          },
          { name: 'button {var2} ', request: { type: 'text', payload: '{var2}' } },
        ],
      };
      const runtime = { trace: { addTrace: sinon.stub() } };
      const variables = { getState: sinon.stub().returns({ var1: 'value1', var2: 'value2' }) };

      addButtonsIfExists(node as any, runtime as any, variables as any);

      expect(runtime.trace.addTrace.args).to.eql([
        [
          {
            type: BaseNode.Utils.TraceType.CHOICE,
            payload: {
              buttons: [
                {
                  name: 'button value1',
                  request: {
                    type: 'intent',
                    payload: {
                      actions: undefined,
                      label: undefined,
                      intent: { name: 'intent' },
                      query: 'button value1',
                    },
                  },
                },
                { name: 'button value2 ', request: { type: 'text', payload: 'value2' } },
              ],
            },
          },
        ],
      ]);
      expect(variables.getState.callCount).to.eql(4);
    });
  });

  describe('slateInjectVariables', () => {
    it('works', () => {
      const variableState = { var1: 'first', var2: 'second', var3: ['third', 'fourth'] };
      const slate = {
        id: '1',
        content: [
          { text: 'test {var1}', underline: true, property: 'prop {var3}' },
          { text: ' ' },
          { children: [{ text: ' nice {var2} var' }] },
        ],
      };

      const expectedSlate = {
        id: '1',
        content: [
          { text: 'test first', underline: true, property: 'prop third,fourth' },
          { text: ' ' },
          { children: [{ text: ' nice second var' }] },
        ],
      };

      expect(slateInjectVariables(slate as any, variableState)).to.eql(expectedSlate);
    });
  });

  describe('slateToPlaintext', () => {
    it('works', () => {
      const content = [
        { text: 'one ', underline: true, property: 'property' },
        { text: 'two' },
        { text: ' ' },
        { children: [{ children: [{ text: ' three' }] }, { text: ' four ' }, { text: 'five ' }] },
      ];

      expect(slateToPlaintext(content as any)).to.eql(['one ', 'two', ' ', ' three four five'].join('\n'));
    });
  });

  describe('isPromptContentInitialyzed', () => {
    it('works', () => {
      expect(isPromptContentInitialized(undefined)).to.eql(false);
      expect(isPromptContentInitialized(null)).to.eql(false);

      expect(isPromptContentInitialized('')).to.eql(true);
      expect(isPromptContentInitialized([])).to.eql(true);
      expect(isPromptContentInitialized([{ text: '' }])).to.eql(true);
      expect(isPromptContentInitialized([{ text: 'text' }])).to.eql(true);
    });
  });

  describe('isPromptContentEmpty', () => {
    it('works', () => {
      expect(isPromptContentEmpty('')).to.eql(true);
      expect(isPromptContentEmpty([])).to.eql(true);
      expect(isPromptContentEmpty([{ text: '' }])).to.eql(true);

      expect(isPromptContentEmpty('hey')).to.eql(false);
      expect(isPromptContentEmpty([{ text: 'text' }])).to.eql(false);
    });
  });

  describe('mapEntities', () => {
    it('works for empty mappings and entities', () => {
      expect(mapEntities([], [])).to.eql({});
    });

    it('works for empty mappings and non empty entities', () => {
      expect(mapEntities([], [{ name: 'name', value: 'value' }])).to.eql({});
    });

    it('works for non empty mappings', () => {
      expect(mapEntities([{ slot: 'slot', variable: 'variable' }])).to.eql({});
    });

    it('works with no override', () => {
      const mapping = [
        { slot: 'slot1', variable: 'var1' },
        { slot: 'slot2', variable: 'var2' },
        { slot: '', variable: 'var3' },
        { slot: 'slot4', variable: 'var4' },
      ];
      const entities = [
        { name: 'slot1', value: 'never' },
        { name: 'slot1', value: 'ent-val1' },
        { name: 'slot2', value: 'ent-val2' },
      ];

      expect(mapEntities(mapping, entities)).to.eql({ var1: 'ent-val1', var2: 'ent-val2' });
    });

    it('works with override', () => {
      const mapping = [
        { slot: 'slot1', variable: 'var1' },
        { slot: 'slot2', variable: 'var2' },
        { slot: '', variable: 'var3' },
        { slot: 'slot4', variable: 'var4' },
      ];
      const entities = [
        { name: 'slot1', value: 'never' },
        { name: 'slot1', value: 'ent-val1' },
        { name: 'slot2', value: 'ent-val2' },
      ];

      expect(mapEntities(mapping, entities, true)).to.eql({ var1: 'ent-val1', var2: 'ent-val2', var4: 0 });
    });
  });
});
