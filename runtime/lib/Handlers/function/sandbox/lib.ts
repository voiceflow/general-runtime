import fetch, { RequestInit, Response } from 'node-fetch';

import { FetchResponse } from './lib.types';

/**
 * Class implements an HTTP client interface which is injected into the sandbox
 * as part of the Voiceflow "standard library" for our Function step's JS execution
 * environment.
 *
 * Each method calls `result.json()` when necessary because the return value of
 * `fetch` does not directly contain the response body content. You have to call
 * a method such as `.json()` to extract that data. However, `isolated-vm`
 * serializes Promise data for security. Thus, our user's code would be unable to
 * call `.json()` because it gets filtered out by the serialization.
 *
 * Therefore, we need to call `.json()` on behalf of the user so they can access the
 * data.
 */
class Fetch {
  private static readonly timeoutMS = 2000;

  private static readonly maxResponseSizeBytes = 1e6; // 1MB

  private static async processResponseBody(result: Response): Promise<FetchResponse> {
    const data = await result.json();

    return {
      ok: result.ok,
      status: result.status,
      body: data,
      headers: result.headers,
    };
  }

  static async fetch(url: string, init?: RequestInit): Promise<FetchResponse> {
    const result = await fetch(url, {
      ...init,
      timeout: Fetch.timeoutMS,
      size: Fetch.maxResponseSizeBytes,
    });

    return Fetch.processResponseBody(result);
  }
}

export const stdlib = {
  Fetch,
};
