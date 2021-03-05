import { RequestType } from '@voiceflow/general-types';
import { expect } from 'chai';

import { isEventRequest, isRuntimeRequest } from '@/lib/services/runtime/types';

describe('runtime types unit tests', () => {
  it('isRuntimeRequest', () => {
    expect(isRuntimeRequest({ type: RequestType.EVENT, payload: { name: 'event-name' } })).to.eql(true);
  });

  it('isEventRequest', () => {
    expect(isEventRequest(null)).to.eql(false);
    expect(isEventRequest({ type: 'random' } as any)).to.eql(false);
    expect(isEventRequest({ type: RequestType.EVENT } as any)).to.eql(true);
  });
});
