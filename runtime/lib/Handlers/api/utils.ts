import { BaseNode } from '@voiceflow/base-types';
import { object } from '@voiceflow/common';
import VError from '@voiceflow/verror';
import DNS from 'dns/promises';
import FormData from 'form-data';
import { Agent } from 'https';
import ipRangeCheck from 'ip-range-check';
import safeJSONStringify from 'json-stringify-safe';
import _ from 'lodash';
import fetch, { BodyInit, Headers, Request, Response } from 'node-fetch';
import { setTimeout as sleep } from 'timers/promises';
import validator from 'validator';

import Runtime from '@/runtime/lib/Runtime';

import { createS3Client, readFileFromS3 } from '../../AWSClient';
import { APIHandlerConfig, DEFAULT_API_HANDLER_CONFIG } from './types';

export type APINodeData = BaseNode.Api.NodeData['action_data'];
const PROHIBITED_IP_RANGES = [
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '127.0.0.0/8',
  '0.0.0.0/8',
  'fd00::/8',
  '169.254.169.254/32',
];

// Regex to match
const BLACKLISTED_URLS: RegExp[] = [];

// Delay amount in ms for when max api call limit is reached
const THROTTLE_DELAY = 2000;

export const stringToNumIfNumeric = (str: string): string | number => {
  if (typeof str === 'string' && !Number.isNaN(Number(str)) && str.length < 16) {
    return Number(str);
  }

  return str;
};

export const ensureProperlyEncoded = (url: string) => {
  // First, decode the URI. This will have no effect if the URI is not encoded.
  const decoded = decodeURI(url);

  // Compare the decoded URI with the original. If they are different, the original was encoded.
  // In that case, return the original URI as it is already properly encoded.
  // Otherwise, encode and return the decoded URI.
  return decoded === url ? encodeURI(decoded) : url;
};

type Variable = string | number;

// eslint-disable-next-line sonarjs/cognitive-complexity
export const getVariable = (path: string, data: any): Variable | undefined => {
  if (!path || typeof path !== 'string') {
    return undefined;
  }

  // Normalized array access syntax (e.g. [0] -> .0)
  const normalizedPath = path.replace(/\[(\d+|{random})]/g, '.$1');

  // Split the path into its parts
  const parts = normalizedPath.split('.');

  // Originally, you were always required to prefix your path with "response."
  // This makes it optional without breaking backwards compatibility
  if (parts[0] === 'response') {
    parts.shift();
  }

  let extracted: any = data;

  // Loop through each part of the path
  // eslint-disable-next-line no-restricted-syntax
  for (const part of parts) {
    // If the part is an array index, convert it to a number
    const index = Number(part);

    if (Number.isNaN(index)) {
      // If the part is {random}, replace it with a random array index
      if (part === '{random}' && Array.isArray(extracted)) {
        extracted = extracted[Math.floor(Math.random() * extracted.length)];
      } else {
        // If the part is not an array index, just use it as-is
        extracted = extracted[part];
      }
    } else {
      // If the part is an array index, use it as-is
      extracted = extracted[index];
    }

    // If the extracted value is undefined, return undefined
    if (extracted === undefined) {
      return undefined;
    }

    // If the extracted value is a string, try to convert it to a number
    if (typeof extracted === 'string') {
      extracted = stringToNumIfNumeric(extracted);
    }
  }

  return extracted;
};

export const ReduceKeyValue = (values: { key: string; val: string }[]) =>
  values.reduce<Record<string, string>>((acc, { key, val }) => {
    if (key) {
      acc[key] = val;
    }
    return acc;
  }, {});

const validateHostname = (urlString: string): string => {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch (err) {
    throw new VError(`url: ${urlString} could not be parsed`, VError.HTTP_STATUS.BAD_REQUEST);
  }

  const { hostname } = url;

  if (hostname.toLowerCase() === 'localhost') {
    throw new VError(`url hostname cannot be localhost: ${urlString}`, VError.HTTP_STATUS.BAD_REQUEST);
  }

  // eslint-disable-next-line sonarjs/no-empty-collection
  if (BLACKLISTED_URLS.some((regex) => regex.test(hostname))) {
    throw new VError('url endpoint is blacklisted', VError.HTTP_STATUS.BAD_REQUEST);
  }

  return hostname;
};

const validateIP = async (hostname: string) => {
  // DNS.resolve returns an array of ips
  const ips = validator.isIP(hostname)
    ? [hostname]
    : await DNS.resolve(hostname).catch(() => {
        throw new VError(`cannot resolve hostname: ${hostname}`, VError.HTTP_STATUS.BAD_REQUEST);
      });

  const badIP = ips.find((ip) => PROHIBITED_IP_RANGES.some((range) => ipRangeCheck(ip, range)));
  if (badIP) {
    throw new VError(`url resolves to IP: ${badIP} in prohibited range`, VError.HTTP_STATUS.BAD_REQUEST);
  }
};

const doFetch = async (
  config: APIHandlerConfig,
  nodeData: BaseNode.Api.NodeData['action_data']
): Promise<{ response: Response; requestOptions: Request }> => {
  const requestOptions = await createRequest(nodeData, config);

  if (requestOptions.size > config.maxRequestBodySizeBytes) {
    throw new Error(
      `Request body size of ${requestOptions.size} bytes exceeds max request body size of ${config.maxRequestBodySizeBytes} bytes`
    );
  }

  const abortController = new AbortController();
  const abortTimeout = setTimeout(() => abortController.abort(), config.requestTimeoutMs);

  try {
    const response = await fetch(requestOptions, {
      signal: abortController.signal as any,
      size: config.maxResponseBodySizeBytes,
    });

    return { response, requestOptions };
  } finally {
    clearTimeout(abortTimeout);
  }
};

const transformResponseBody = (
  responseJSON: object,
  response: Response,
  actionData: BaseNode.Api.NodeData['action_data']
): { newVariables: Record<string, Variable>; responseJSON: any } => {
  const responseBodyAdditions = {
    VF_STATUS_CODE: response.status,
    VF_HEADERS: Object.fromEntries(response.headers.entries()),
  };

  const newVariables: Record<string, Variable> = Object.fromEntries(
    actionData.mapping
      // Filter out mappings with variable names that are null
      .filter((mapping): mapping is BaseNode.Api.APIMapping & { var: string } => typeof mapping.var === 'string')
      // Create mapping of variable name to variable value from the response JSON
      .map((mapping): [string, Variable | undefined] => [mapping.var, getVariable(mapping.path, responseJSON)])
      // Filter out variables that are undefined
      .filter((keyValuePair): keyValuePair is [string, Variable] => keyValuePair[1] !== undefined)
  );

  return {
    newVariables,
    responseJSON:
      // If response body is a JSON object then add in the `VF_` helpers
      object.isObject(responseJSON) && !Array.isArray(responseJSON)
        ? { ...responseJSON, ...responseBodyAdditions }
        : responseJSON,
  };
};

export interface APICallResult {
  variables: Record<string, Variable>;
  request: Request;
  response: Response;
  responseJSON: any;
}

export const callAPI = async (nodeData: APINodeData, config: Partial<APIHandlerConfig>): Promise<APICallResult> => {
  const { response, requestOptions } = await doFetch(_.merge(DEFAULT_API_HANDLER_CONFIG, config), nodeData);

  const rawResponseJSON = await response
    .json()
    // Ignore JSON parsing errors and default to an empty object
    // This is a kinda hacky way to support non-JSON responses without much effort
    .catch(() => ({}));

  const { newVariables, responseJSON } = transformResponseBody(rawResponseJSON, response, nodeData);

  return {
    variables: newVariables,
    request: requestOptions,
    response,
    responseJSON,
  };
};

export const makeAPICall = async (
  nodeData: APINodeData,
  runtime: Runtime,
  config: Partial<APIHandlerConfig>
): Promise<APICallResult> => {
  const hostname = validateHostname(nodeData.url);
  await validateIP(hostname);

  try {
    if (await runtime.outgoingApiLimiter.addHostnameUseAndShouldThrottle(hostname)) {
      // if the use of the hostname is high, delay the api call but let it happen
      await sleep(THROTTLE_DELAY);
    }
  } catch (error) {
    runtime.trace.debug(
      `Outgoing Api Rate Limiter failed - Error: \n${safeJSONStringify(error.response?.data || error)}`,
      BaseNode.NodeType.API
    );
  }

  return callAPI(nodeData, config);
};

const createAgent = async (
  config: APIHandlerConfig,
  tls: BaseNode.Api.NodeData['action_data']['tls']
): Promise<Agent | undefined> => {
  if (
    !tls?.cert ||
    !tls?.key ||
    !config.s3TLSBucket ||
    !config.s3AccessKey ||
    !config.s3SecretAccessKey ||
    !config.awsRegion
  )
    return;

  const s3Client = createS3Client(config);

  if (!s3Client) return;
  const [cert, key] = await Promise.all([
    readFileFromS3(s3Client, config.s3TLSBucket, tls?.cert),
    readFileFromS3(s3Client, config.s3TLSBucket, tls?.key),
  ]);

  if (!cert || !key) return;

  // eslint-disable-next-line consistent-return
  return new Agent({ cert, key });
};

export const createRequest = async (
  actionData: BaseNode.Api.NodeData['action_data'],
  config: APIHandlerConfig
): Promise<Request> => {
  const headers = new Headers(
    actionData.headers
      // Filter out invalid headers - avoid an Error: " is not a legal HTTP header name"
      .filter((header) => header.key && header.val)
      .map((header): [headerName: string, headerValue: string] => [header.key, header.val])
  );

  let body: BodyInit | undefined;

  if (actionData.method !== BaseNode.Api.APIMethod.GET) {
    switch (actionData.bodyInputType) {
      case BaseNode.Api.APIBodyType.RAW_INPUT:
        body = actionData.content;
        break;
      case BaseNode.Api.APIBodyType.URL_ENCODED:
        body = new URLSearchParams(actionData.body.map(({ key, val }): [key: string, value: string] => [key, val]));

        headers.set('Content-Type', 'application/x-www-form-urlencoded');
        break;
      case BaseNode.Api.APIBodyType.FORM_DATA: {
        const formData = new FormData();
        actionData.body.forEach(({ key, val }) => formData.append(key, val));
        body = formData;

        Object.entries(formData.getHeaders(headers)).map(([key, val]) => headers.set(key, val));
        break;
      }
      default:
        throw new RangeError(`Unsupported body input type: ${actionData.bodyInputType}`);
    }
  }

  const url = new URL(actionData.url);
  actionData.params
    // Filter out invalid params
    .filter((param) => param.key)
    .forEach((param) => url.searchParams.append(param.key, param.val));

  return new Request(url.href, {
    method: actionData.method,
    body,
    headers,
    agent: await createAgent(config, actionData.tls),
  });
};
