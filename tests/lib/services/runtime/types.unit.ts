import { RequestType } from '@voiceflow/general-types';
import { expect } from 'chai';

import { isRuntimeRequest } from '@/lib/services/runtime/types';

describe('runtime types unit tests', () => {
  it('isRuntimeRequest', () => {
    expect(isRuntimeRequest({ type: RequestType.INTENT, payload: { name: 'event-name' } })).to.eql(true);
  });
});
