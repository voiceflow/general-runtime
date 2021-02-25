import { expect } from 'chai';
import sinon from 'sinon';

import { RequestType } from '@/../general-types/build';
import SlotsManager, { utils as defaultUtils } from '@/lib/services/slots';

describe('slots manager unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('handle', () => {
    it('reduces NATOAPCO slot type values correctly', async () => {
      const version = {
        prototype: {
          model: {
            slots: [
              {
                name: 'natoSlot',
                type: {
                  value: 'VF.NATOAPCO',
                },
              },
              {
                name: 'otherSlot',
                type: {
                  value: 'VF.NUMBER',
                },
              },
            ],
          },
        },
      };

      const context = {
        data: {
          api: {
            getVersion: sinon.stub().resolves(version),
          },
        },
        request: {
          type: RequestType.INTENT,
          payload: {
            intent: {
              name: 'foo',
            },
            entities: [
              {
                name: 'natoSlot',
                rawValue: [['November'], ['India'], ['Charlie'], ['Echo'], ['-'], ['1'], ['000'], ['.'], ['00']],
              },
              {
                name: 'otherSlot',
                value: 'unchanged',
              },
            ],
          },
        },
      };
      const slots = new SlotsManager({ utils: { ...defaultUtils } } as any, {} as any);

      const newContext = await slots.handle(context as any);
      const newEntities = (newContext.request?.payload as any).entities;
      expect(newEntities[0].value).to.eql('NICE-1000.00');
      expect(newEntities[1].value).to.eql('unchanged');
    });
  });
});
