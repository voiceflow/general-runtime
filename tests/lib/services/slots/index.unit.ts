import { expect } from 'chai';
import sinon from 'sinon';

import SlotsManager, { utils as defaultUtils } from '@/lib/services/slots';

import { context, NATO_REQUEST_1, NATO_REQUEST_2 } from './fixture';

describe('slots manager unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('handle', () => {
    it('reduces NATOAPCO slot type values correctly', async () => {
      const slots = new SlotsManager({ utils: { ...defaultUtils } } as any, {} as any);

      const input = {
        ...context,
        ...NATO_REQUEST_1,
      };

      const newContext = await slots.handle(input as any);
      const newEntities = (newContext.request?.payload as any).entities;
      expect(newEntities[0].value).to.eql('NICE-1000.00');
      expect(newEntities[1].value).to.eql('unchanged');
    });

    it('catches multi-number inputs and exceptions in between LUIS-returned NATOAPCO slots', async () => {
      const slots = new SlotsManager({ utils: { ...defaultUtils } } as any, {} as any);

      const input = {
        ...context,
        ...NATO_REQUEST_2,
      };

      const newContext = await slots.handle(input as any);
      const newEntities = (newContext.request?.payload as any).entities;
      expect(newEntities[0].value).to.eql('12A234B45C67');
    });
  });
});
