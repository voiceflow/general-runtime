import { BaseRequest } from '@voiceflow/base-types';
import { RequestType } from '@voiceflow/dtos';
import { expect } from 'chai';
import _ from 'lodash';

import {
  isAlexaEventIntentRequest,
  isGeneralIntentRequest,
  isPathRequest,
  isRuntimeRequest,
} from '@/lib/services/runtime/types';

describe('runtime types unit tests', () => {
  it('isRuntimeRequest', () => {
    const fail1 = undefined;
    const fail2 = 'string';
    const fail3 = 1;
    const fail4 = true;
    const fail5 = [] as any[];
    const fail6 = {};
    const fail7 = { type: 'request-type', diagramID: 1 };

    const pass1 = null;
    const pass2 = { type: 'request-type' };
    const pass3 = { type: RequestType.INTENT, payload: { exampleValue: 1 } };
    const pass4 = { type: RequestType.LAUNCH, diagramID: 'string' };
    const pass5 = { type: '', payload: { exampleValue: 1 }, diagramID: 'string' };
    const pass6 = {
      type: BaseRequest.RequestType.INTENT,
      payload: { name: 'event-name' },
    };

    expect(isRuntimeRequest(fail1)).to.eql(false);
    expect(isRuntimeRequest(fail2)).to.eql(false);
    expect(isRuntimeRequest(fail3)).to.eql(false);
    expect(isRuntimeRequest(fail4)).to.eql(false);
    expect(isRuntimeRequest(fail5)).to.eql(false);
    expect(isRuntimeRequest(fail6)).to.eql(false);
    expect(isRuntimeRequest(fail7)).to.eql(false);

    expect(isRuntimeRequest(pass1)).to.eql(true);
    expect(isRuntimeRequest(pass2)).to.eql(true);
    expect(isRuntimeRequest(pass3)).to.eql(true);
    expect(isRuntimeRequest(pass4)).to.eql(true);
    expect(isRuntimeRequest(pass5)).to.eql(true);
    expect(isRuntimeRequest(pass6)).to.eql(true);
  });

  describe('testing intent-type request type guards', () => {
    const type = RequestType.INTENT;
    const payload = {
      intent: {
        name: 'order pizza',
        extraneousProperty: 1,
      },
      query: 'query string',
      entities: [],
      label: 'label property',
      actions: [
        {
          type: 'action-type',
          payload: 1,
          extraneousProperty: 1,
        },
        {
          type: 'action-type',
          payload: 'true',
        },
        {
          type: 'action-type',
          payload: {
            val: true,
          },
        },
      ],
      data: {
        val1: 1,
        val2: '2',
      },
      extraneousProperty: 1,
    };

    it('isGeneralIntentRequest', () => {
      const fail1 = null;
      const fail2 = undefined;
      const fail3 = 'string';
      const fail4 = 12;
      const fail5 = true;
      const fail6 = {};
      const fail7 = [] as any[];
      const fail8 = { type };
      const fail9 = { payload };
      const { entities, ...fail10payload } = payload;
      const fail10 = { type, payload: fail10payload };
      const fail11 = { type: 'request-type', payload };

      const pass1 = { type, payload };
      const { data, ...pass1payload } = payload;
      const pass2 = { type, payload: pass1payload };

      expect(isGeneralIntentRequest(fail1)).to.eql(false);
      expect(isGeneralIntentRequest(fail2)).to.eql(false);
      expect(isGeneralIntentRequest(fail3)).to.eql(false);
      expect(isGeneralIntentRequest(fail4)).to.eql(false);
      expect(isGeneralIntentRequest(fail5)).to.eql(false);
      expect(isGeneralIntentRequest(fail6)).to.eql(false);
      expect(isGeneralIntentRequest(fail7)).to.eql(false);
      expect(isGeneralIntentRequest(fail8)).to.eql(false);
      expect(isGeneralIntentRequest(fail9)).to.eql(false);
      expect(isGeneralIntentRequest(fail10)).to.eql(false);
      expect(isGeneralIntentRequest(fail11)).to.eql(false);

      expect(isGeneralIntentRequest(pass1)).to.eql(true);
      expect(isGeneralIntentRequest(pass2)).to.eql(true);
    });

    it('isAlexaEventIntentRequest', () => {
      const fail1 = null;
      const fail2 = undefined;
      const fail3 = 'string';
      const fail4 = 12;
      const fail5 = true;
      const fail6 = {};
      const fail7 = [] as any[];
      const fail8 = { type };
      const fail9 = { payload };
      const { entities, ...fail10payload } = payload;
      const fail10 = { type, payload: fail10payload };
      const { data, ...fail11payload } = payload;
      const fail11 = { type, payload: fail11payload };
      const fail12 = { type: 'request-type', payload };

      const pass1 = { type, payload };

      expect(isAlexaEventIntentRequest(fail1)).to.eql(false);
      expect(isAlexaEventIntentRequest(fail2)).to.eql(false);
      expect(isAlexaEventIntentRequest(fail3)).to.eql(false);
      expect(isAlexaEventIntentRequest(fail4)).to.eql(false);
      expect(isAlexaEventIntentRequest(fail5)).to.eql(false);
      expect(isAlexaEventIntentRequest(fail6)).to.eql(false);
      expect(isAlexaEventIntentRequest(fail7)).to.eql(false);
      expect(isAlexaEventIntentRequest(fail8)).to.eql(false);
      expect(isAlexaEventIntentRequest(fail9)).to.eql(false);
      expect(isAlexaEventIntentRequest(fail10)).to.eql(false);
      expect(isAlexaEventIntentRequest(fail11)).to.eql(false);
      expect(isAlexaEventIntentRequest(fail12)).to.eql(false);

      expect(isAlexaEventIntentRequest(pass1)).to.eql(true);
    });
  });

  it('isPathRequest', () => {
    const type = 'path-example';
    const payload = {
      label: 'label-value',
      actions: [
        {
          type: 'action-type',
          payload: 'string',
        },
        {
          type: 'another-action-type',
          payload: {
            exampleValue: 1,
          },
        },
      ],
    };

    const fail1 = undefined;
    const fail2 = 'string';
    const fail3 = 1;
    const fail4 = true;
    const fail5 = [] as any[];
    const fail6 = {};
    const fail7 = { type };
    const fail8 = { payload };
    const { label, ...fail9payload } = payload;
    const fail9 = { type, payload: fail9payload };
    const fail10 = { type: 'request-type', payload };

    const pass1 = { type, payload };
    const { actions, ...pass2payload } = payload;
    const pass2 = { type, payload: pass2payload };

    expect(isPathRequest(fail1)).to.eql(false);
    expect(isPathRequest(fail2)).to.eql(false);
    expect(isPathRequest(fail3)).to.eql(false);
    expect(isPathRequest(fail4)).to.eql(false);
    expect(isPathRequest(fail5)).to.eql(false);
    expect(isPathRequest(fail6)).to.eql(false);
    expect(isPathRequest(fail7)).to.eql(false);
    expect(isPathRequest(fail8)).to.eql(false);
    expect(isPathRequest(fail9)).to.eql(false);
    expect(isPathRequest(fail10)).to.eql(false);

    expect(isPathRequest(pass1)).to.eql(true);
    expect(isPathRequest(pass2)).to.eql(true);
  });
});
