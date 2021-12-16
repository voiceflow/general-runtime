import { Node } from '@voiceflow/base-types';
import VError from '@voiceflow/verror';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { promises as DNS } from 'dns';
import FormData from 'form-data';
import ipRangeCheck from 'ip-range-check';
import _ from 'lodash';
import querystring from 'querystring';
import validator from 'validator';

import Runtime from '@/runtime/lib/Runtime';

export type APINodeData = Node.Api.NodeData['action_data'];
const PROHIBITED_IP_RANGES = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '127.0.0.0/8', '0.0.0.0/8', 'fd00::/8', '169.254.169.254/32'];

// Regex to match
const BLACKLISTED_URLS: RegExp[] = [];

// Delay amount in ms for when max api call limit is reached
const THROTTLE_DELAY = 2000;

export const stringToNumIfNumeric = (str: string): string | number => {
  /* eslint-disable-next-line */
  if (_.isString(str) && !isNaN(str as any) && str.length < 16) {
    return Number(str);
  }

  return str;
};

export const getVariable = (path: string, data: any) => {
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

// eslint-disable-next-line sonarjs/cognitive-complexity
export const formatRequestConfig = (data: APINodeData) => {
  const { method, bodyInputType, headers, body, params, url, content } = data;

  const options: AxiosRequestConfig = {
    method,
    url,
    // If the request takes longer than `timeout` in ms, the request will be aborted
    timeout: 29000,
    // defines the max size of the http response content in bytes allowed in node.js
    maxContentLength: 100000,
    // defines the max size of the http request content in bytes allowed
    maxBodyLength: 100000,
  };

  if (params && params.length > 0) {
    const formattedParams = ReduceKeyValue(params);
    if (!_.isEmpty(formattedParams)) options.params = formattedParams;
  }

  if (headers && headers.length > 0) {
    const formattedHeaders = ReduceKeyValue(headers);
    if (!_.isEmpty(formattedHeaders)) options.headers = formattedHeaders;
  }
  if (!options.headers) options.headers = {};

  // do not parse body if GET request
  if (method === Node.Api.APIMethod.GET) {
    return options;
  }
  if (bodyInputType === Node.Api.APIBodyType.RAW_INPUT) {
    // attempt to convert into JSON
    try {
      options.data = JSON.parse(content);
    } catch (e) {
      options.data = data;
    }
  } else if (bodyInputType === Node.Api.APIBodyType.FORM_DATA) {
    const formData = new FormData();
    body.forEach((b) => {
      if (b.key) {
        formData.append(b.key, b.val);
      }
    });
    options.headers = { ...options.headers, ...formData.getHeaders() };
    options.data = formData;
  } else if (bodyInputType === Node.Api.APIBodyType.URL_ENCODED) {
    if (Array.isArray(body)) {
      options.data = querystring.stringify(ReduceKeyValue(body));
    } else {
      options.data = querystring.stringify(body);
    }
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
  } else if (typeof body === 'string') {
    options.data = body;
  } else if (bodyInputType === 'keyValue' || Array.isArray(body)) {
    options.data = ReduceKeyValue(body);
  }

  options.validateStatus = () => true;

  return options;
};

export const makeAPICall = async (nodeData: APINodeData, runtime: Runtime) => {
  try {
    const hostname = validateHostname(nodeData.url);
    await validateIP(hostname);

    if (await runtime.outgoingApiLimiter.addHostnameUseAndShouldThrottle(hostname)) {
      // if the use of the hostname is high, delay the api call but let it happen
      await new Promise((resolve) => setTimeout(resolve, THROTTLE_DELAY));
    }

    const options = formatRequestConfig(nodeData);

    const { data, headers, status } = (await axios(options)) as AxiosResponse<{ VF_STATUS_CODE?: number; VF_HEADERS?: any }>;

    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      data.VF_STATUS_CODE = status;
      data.VF_HEADERS = headers;
    }

    const newVariables = Object.fromEntries((nodeData.mapping ?? []).filter((map) => map.var).map((map) => [map.var, getVariable(map.path, data)]));

    return { variables: newVariables, response: { data, headers, status } };
  } catch (e) {
    throw e;
  }
};
