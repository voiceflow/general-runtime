import { expect } from 'chai';
import sinon from 'sinon';

import Filter from '@/lib/services/filter';

import { BLOCK_TRACE_MIDDLE, BLOCK_TRACE_START, CHOICE_TRACE, context, DEBUG_TRACE, SPEAK_TRACE_NO_SSML, SPEAK_TRACE_SSML } from './fixture';

describe('filter manager unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('no filtering, no config specified', () => {
    const filter = new Filter({} as any, {} as any);

    const input = {
      ...context,
      data: {},
    };
    const result = filter.handle(input as any);

    expect(result).to.eql({
      ...input,
      trace: [SPEAK_TRACE_NO_SSML, SPEAK_TRACE_NO_SSML, CHOICE_TRACE],
    });
  });

  it('no filtering, config empty', () => {
    const filter = new Filter({} as any, {} as any);

    const input = {
      ...context,
      data: { config: {} },
    };
    const result = filter.handle(input as any);

    expect(result).to.eql({
      ...input,
      trace: [SPEAK_TRACE_NO_SSML, SPEAK_TRACE_NO_SSML, CHOICE_TRACE],
    });
  });

  it('filters ssml', () => {
    const filter = new Filter({} as any, {} as any);

    const input = {
      ...context,
      data: { config: { stripSSML: true } },
    };
    const result = filter.handle(input as any);

    expect(result).to.eql({
      ...input,
      trace: [SPEAK_TRACE_NO_SSML, SPEAK_TRACE_NO_SSML, CHOICE_TRACE],
    });
  });

  it('keeps ssml', () => {
    const filter = new Filter({} as any, {} as any);

    const input = {
      ...context,
      data: { config: { stripSSML: false } },
    };
    const result = filter.handle(input as any);

    expect(result).to.eql({
      ...input,
      trace: [SPEAK_TRACE_NO_SSML, SPEAK_TRACE_SSML, CHOICE_TRACE],
    });
  });

  it('no exclude types', () => {
    const filter = new Filter({} as any, {} as any);

    const input = {
      ...context,
      data: { config: { excludeTypes: [] } },
    };
    const result = filter.handle(input as any);

    expect(result).to.eql({
      ...input,
      trace: [BLOCK_TRACE_START, DEBUG_TRACE, BLOCK_TRACE_MIDDLE, SPEAK_TRACE_NO_SSML, SPEAK_TRACE_NO_SSML, CHOICE_TRACE],
    });
  });
});
