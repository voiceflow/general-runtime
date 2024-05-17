import { Subject } from 'rxjs';

export type Predicate<T> = (buffer: T) => PredicateResult;
export type PredicateResult = boolean | 'stop';
export type Accumulator<T> = (buffer: T, value: T) => T;

export class BufferedReducerSubject<T> extends Subject<T> {
  private buffer?: T;

  private buffering = true;

  constructor(private readonly predicate: Predicate<T>, private readonly accumulator: Accumulator<T>) {
    super();
  }

  next(value: T): void {
    if (!this.buffering) {
      super.next(value);
      return;
    }

    this.buffer = this.buffer ? this.accumulator(this.buffer, value) : value;

    try {
      const result = this.predicate(this.buffer);

      if (!result) {
        this.buffering = false;
        super.next(this.buffer);
      }
    } catch (err) {
      super.error(err);
    }
  }

  unsubscribe(): void {
    delete this.buffer;
    super.unsubscribe();
  }
}
