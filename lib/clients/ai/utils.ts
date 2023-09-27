import { Utils } from '@voiceflow/common';
import { CreateModerationResponseResultsInner } from '@voiceflow/openai';

interface AIModerationErrorDataItem {
  input: string;
  error: CreateModerationResponseResultsInner;
}
export class AIModerationError extends Error {
  constructor(public readonly data: AIModerationErrorDataItem[]) {
    super(
      '[moderation error] Sorry, we can’t fulfill your request due to language or content in your message that violates our Terms of Service.'
    );
  }
}

export const delayedPromiseRace = async <T extends () => Promise<any>>(
  func: T,
  delay: number,
  retries = 0
): Promise<Awaited<ReturnType<T>>> => {
  /*
      Races retries calls to func with delay inbetween each call.
      e.g. OpenAI call 1 -> wait [delay] ms -> OpenAI Call 2 -> OpenAI call 2 resolves -> return result 2.
      This is in response to latency spikes that impact random Azure OpenAI requests.
    */
  const promises = [];
  const timeoutSymbol = Symbol('timeout');

  for (let i = 0; i <= retries; i++) {
    promises.push(func());

    // eslint-disable-next-line no-await-in-loop
    const result = await Promise.race([...promises, Utils.promise.delay(delay, timeoutSymbol)]);

    // if the timeout is the race winner, we continue the loop
    if (result !== timeoutSymbol) return result;
  }

  // if all retries are already invoked, wait for first one to finish
  return Promise.race([...promises]);
};
