import produce from 'immer';

import { Event, EventType } from '@/runtime/lib/Lifecycle';

import Frame, { State as FrameState } from './Frame';

interface Handlers {
  didChange?: (event: Event<EventType.stackDidChange>) => void;
  willChange?: (event: Event<EventType.stackWillChange>) => void;
}

class Stack {
  static getFrames(stack: FrameState[]): Frame[] {
    return [...stack.map((frameState) => new Frame(frameState))];
  }

  private frames: Frame[] = [];

  constructor(stack: FrameState[], private handlers: Handlers) {
    this.frames = Stack.getFrames(stack ?? []);
  }

  public getState(): FrameState[] {
    return this.frames.map((frame) => frame.getState());
  }

  public getSize(): number {
    return this.frames.length;
  }

  public get(index: number): Frame {
    return this.frames[index];
  }

  public top(): Frame {
    return this.frames[this.frames.length - 1];
  }

  public updateFrames(nextFrames: Frame[]) {
    this.handlers?.willChange?.({ nextFrames });

    const prevFrames = this.frames;
    this.frames = nextFrames;

    this.handlers?.didChange?.({ prevFrames });
  }

  public pop(): Frame | undefined {
    let frame: Frame | undefined;

    const nextFrames = produce(this.frames, (draft: Frame[]) => {
      frame = draft.pop();
    });

    this.updateFrames(nextFrames);

    return frame;
  }

  // pops all frames until index
  public popTo(index: number): void {
    this.updateFrames(this.frames.slice(0, index));
  }

  public lift(depth = 1): void {
    this.updateFrames(this.frames.slice(0, this.frames.length - depth));
  }

  public push(frame: Frame): void {
    this.updateFrames((this.frames = [...this.frames, frame]));
  }

  public unshift(frame: Frame): void {
    this.updateFrames((this.frames = [frame, ...this.frames]));
  }

  public update(frames: FrameState[]): void {
    this.updateFrames(Stack.getFrames(frames));
  }

  public getFrames(): Frame[] {
    return this.frames;
  }

  public isEmpty(): boolean {
    return this.getSize() === 0;
  }

  public flush(): void {
    this.updateFrames([]);
  }
}

export { Frame, FrameState };

export default Stack;
