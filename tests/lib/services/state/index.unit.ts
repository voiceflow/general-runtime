import { expect } from 'chai';
import sinon from 'sinon';

import StateManager, { utils as defaultUtils } from '@/lib/services/state';

const VERSION_ID = 'version_id';

describe('state manager unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('generate', () => {
    it('works', async () => {
      const version = {
        prototype: {
          model: {
            slots: [{ name: 'slot1' }],
          },
          context: {
            variables: { variable1: 1, variable2: 2 },
          },
        },
        variables: ['variable1'],
        rootDiagramID: 'a',
      };
      const services = {
        dataAPI: {
          getVersion: sinon.stub().resolves(version),
        },
      };

      const state = new StateManager({ ...services, utils: { ...defaultUtils } } as any, {} as any);

      expect(await state.generate(VERSION_ID)).to.eql({
        stack: [
          {
            programID: version.rootDiagramID,
            storage: {},
            variables: {},
          },
        ],
        variables: { slot1: 0, variable1: 1, variable2: 2 },
        storage: {},
      });
      expect(services.dataAPI.getVersion.args).to.eql([[VERSION_ID]]);
    });
  });
});
