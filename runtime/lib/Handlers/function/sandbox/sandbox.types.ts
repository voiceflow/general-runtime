import ivm from 'isolated-vm';

export interface ExecutionContext {
  isolate: ivm.Isolate;
  context: ivm.Context;
  userCodeModule: ivm.Module;
}
