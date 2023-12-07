export class LambdaException extends Error {
  get message(): string {
    return `An error occurred while executing the Function code: ${this.message}`;
  }
}
