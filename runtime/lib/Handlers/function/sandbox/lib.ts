import fetch, { RequestInit, Response } from 'node-fetch';

import { AdditionalOptions, FetchResponse, ParseType } from './lib.types';

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

  private static async processResponseBody(result: Response, options: AdditionalOptions) {
    const contentType = result.headers.get('content-type') ?? '';

    // If user specified parsing options, then use that to format the response data.
    if (options.parseType) {
      const { parseType } = options;

      switch (parseType) {
        case ParseType.ArrayBuffer:
          return { arrayBuffer: await result.arrayBuffer() };
        case ParseType.Blob:
          return { blob: await result.blob() };
        case ParseType.Text:
          return { text: await result.text() };
        case ParseType.JSON:
          return { json: await result.json() };
        default:
          return {};
      }
    }

    // Otherwise, try to make reasonable inferences on how we parse the data.
    if (contentType.includes('application/json')) {
      return { json: await result.json() };
    }
    return { text: await result.text() };
  }

  private static async processResponse(result: Response, options: AdditionalOptions): Promise<FetchResponse> {
    const { statusText, ok, status, headers } = result;

    return {
      statusText,
      ok,
      status,
      headers,
      ...(await Fetch.processResponseBody(result, options)),
    };
  }

  static async fetch(url: string, init: RequestInit = {}, options: AdditionalOptions = {}): Promise<FetchResponse> {
    const result = await fetch(url, {
      ...init,
      timeout: Fetch.timeoutMS,
      size: Fetch.maxResponseSizeBytes,
    });

    return Fetch.processResponse(result, options);
  }
}

export const stdlib = {
  Fetch,
};
