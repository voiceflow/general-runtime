import { RequestType } from '@voiceflow/general-types';
import { expect } from 'chai';

import { isGeneralRequest, isRuntimeRequest } from '@/lib/services/runtime/types';

describe('runtime types unit tests', () => {
  it('isRuntimeRequest', () => {
    expect(isRuntimeRequest({ type: RequestType.INTENT, payload: { name: 'event-name' } })).to.eql(true);
  });

  it('isEventRequest', () => {
    expect(isGeneralRequest(null)).to.eql(false);
    expect(isGeneralRequest({ type: 'random', payload: {} } as any)).to.eql(false);
    expect(isGeneralRequest({ type: 'random', payload: { name: '' } } as any)).to.eql(false);
    expect(isGeneralRequest({ type: 'random', payload: { name: 'here' } } as any)).to.eql(true);
  });
});
