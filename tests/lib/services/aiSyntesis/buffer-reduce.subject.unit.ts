import { expect } from 'chai';
import { catchError, throwError } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import sinon from 'sinon';

import { BufferedReducerStopException } from '@/lib/services/aiSynthesis/buffer-reduce.exception';
import { BufferedReducerSubject } from '@/lib/services/aiSynthesis/buffer-reduce.subject';

describe('BufferedReducerSubject', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).to.deep.eq(expected);
    });
  });

  it('buffers values, stops buffering if predicate returns true', () => {
    const predicate = sinon.fake((buffer: number) => buffer < 2);
    const accumulator = sinon.fake((buffer: number, value: number) => buffer + value);

    const subject = new BufferedReducerSubject<number>(predicate, accumulator);

    testScheduler.run(({ cold, expectObservable }) => {
      const test$ = cold('a-b-c-|', { a: 1, b: 1, c: 3 });

      expectObservable(subject).toBe('--b-c-|', {
        b: 2,
        c: 3,
      });

      test$.subscribe(subject);
    });
  });

  it('does not buffer values if predicate returns false', () => {
    const predicate = sinon.fake(() => false);
    const accumulator = sinon.fake((buffer: number, value: number) => buffer + value);

    const subject = new BufferedReducerSubject<number>(predicate, accumulator);

    testScheduler.run(({ cold, expectObservable }) => {
      const test$ = cold('a-b-c-|', { a: 1, b: 2, c: 3 });

      expectObservable(subject).toBe('a-b-c-|', {
        a: 1,
        b: 2,
        c: 3,
      });

      test$.subscribe(subject);
    });
  });

  it('buffers values, erroring on not found', () => {
    const predicate = sinon.fake((buffer: number) => {
      if (buffer >= 3) throw new BufferedReducerStopException();
      else return true;
    });
    const accumulator = sinon.fake((buffer: number, value: number) => buffer + value);

    const subject = new BufferedReducerSubject<number>(predicate, accumulator);

    testScheduler.run(({ cold, expectObservable }) => {
      const test$ = cold('a-b-c-|', { a: 1, b: 2, c: 3 });

      expectObservable(
        subject.pipe(
          // convert error to "error" to match expectation of `#` in marble diagram
          catchError((err) =>
            err instanceof BufferedReducerStopException ? throwError(() => 'error') : throwError(() => err)
          )
        )
      ).toBe('--#');

      test$.subscribe(subject);
    });
  });
});
