export abstract class ExecuteFunctionException extends Error {
  abstract toCanonicalError(): string;
}
