import { BaseNode } from '@voiceflow/base-types';
import { object } from '@voiceflow/common';
import VError from '@voiceflow/verror';
import DNS from 'dns/promises';
import FormData from 'form-data';
import ipRangeCheck from 'ip-range-check';
import safeJSONStringify from 'json-stringify-safe';
import _merge from 'lodash/merge';
import fetch, { BodyInit, Headers, Request, Response } from 'node-fetch';
import { setTimeout as sleep } from 'timers/promises';
import validator from 'validator';

import Runtime from '@/runtime/lib/Runtime';

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

type Variable = string | number;

// eslint-disable-next-line sonarjs/cognitive-complexity
export const getVariable = (path: string, data: any): Variable | undefined => {
  if (!path || typeof path !== 'string') {
    return undefined;
  }

  const props = path.split('.');
  let curData: any = { response: data };

  props.forEach((prop) => {
    const propsAndInds = prop.split('[');
    propsAndInds.forEach((propOrInd) => {
      if (propOrInd.indexOf(']') >= 0) {
        const indexStr = propOrInd.slice(0, -1);
        let index;
        if (indexStr.toLowerCase() === '{random}') {
          index = Math.floor(Math.random() * curData.length);
        } else {
          index = parseInt(indexStr, 10);
        }
        curData = curData ? curData[index] : undefined;
      } else {
        curData = curData ? curData[propOrInd] : undefined;
      }
    });
  });
  return stringToNumIfNumeric(curData);
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

export interface ResponseConfig {
  requestTimeoutMs?: number;
  maxResponseBodySizeBytes?: number;
  maxRequestBodySizeBytes?: number;
}

const DEFAULT_RESPONSE_CONFIG: Readonly<Required<ResponseConfig>> = {
  requestTimeoutMs: 20_000,
  maxResponseBodySizeBytes: 1_000_000,
  maxRequestBodySizeBytes: 1_000_000,
};

const doFetch = async (
  config: ResponseConfig,
  nodeData: BaseNode.Api.NodeData['action_data']
): Promise<{ response: Response; requestOptions: Request }> => {
  const actualConfig = _merge(DEFAULT_RESPONSE_CONFIG, config);
  const requestOptions = createRequest(nodeData);

  if (requestOptions.size > actualConfig.maxRequestBodySizeBytes) {
    throw new Error(
      `Request body size of ${requestOptions.size} bytes exceeds max request body size of ${actualConfig.maxRequestBodySizeBytes} bytes`
    );
  }

  const abortController = new AbortController();
  const abortTimeout = setTimeout(() => abortController.abort(), actualConfig.requestTimeoutMs);

  try {
    const response = await fetch(requestOptions, {
      signal: abortController.signal as any,
      size: actualConfig.maxResponseBodySizeBytes,
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

export const makeAPICall = async (nodeData: APINodeData, runtime: Runtime, config: ResponseConfig) => {
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

  const { response, requestOptions } = await doFetch(config, nodeData);

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

export const createRequest = (actionData: BaseNode.Api.NodeData['action_data']): Request => {
  let headers = new Headers(
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

        headers = new Headers(formData.getHeaders(headers));
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
  });
};
