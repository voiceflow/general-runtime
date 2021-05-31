import { IntegrationType } from '@voiceflow/general-types';
import { expect } from 'chai';

import { resultMappings } from '@/runtime/lib/Handlers/integrations/utils';

describe('handlers integrations utils unit tests', () => {
  describe('resultMappings', () => {
    describe('GOOGLE_SHEETS', () => {
      it('no mappings', () => {
        const resultData = { foo: 'bar' };
        expect(resultMappings({ selected_integration: IntegrationType.GOOGLE_SHEETS } as any, resultData as any)).to.eql({});
      });

      it('with mappings', () => {
        const resultData = { _cell_location: { row: 'val1' }, foo: 'val2' };
        const node = {
          selected_integration: IntegrationType.GOOGLE_SHEETS,
          action_data: {
            mapping: [
              { arg1: 'row_number', arg2: 'var1' },
              { arg1: 'foo', arg2: 'var2' },
            ],
          },
        };
        expect(resultMappings(node as any, resultData as any)).to.eql({ var1: 'val1', var2: 'val2' });
      });
    });

    it('CUSTOM_API', () => {
      const resultData = { foo: 'bar' };
      expect(resultMappings({ selected_integration: IntegrationType.CUSTOM_API } as any, resultData as any)).to.eql(resultData);
    });

    it('ZAPIER', () => {
      expect(resultMappings({ selected_integration: IntegrationType.ZAPIER } as any, null as any)).to.eql({});
    });
  });
});
