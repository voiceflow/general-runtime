import { BaseRequest } from '@voiceflow/base-types';
import { RequestType } from '@voiceflow/dtos';
import { expect } from 'chai';
import _ from 'lodash';

import { isPathRequest, isRuntimeRequest } from '@/lib/services/runtime/types';

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
});
