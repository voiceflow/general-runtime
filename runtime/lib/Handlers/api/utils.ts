import { Node } from '@voiceflow/base-types';
import VError from '@voiceflow/verror';
import axios from 'axios';
import { promises as DNS } from 'dns';
import FormData from 'form-data';
import ipRangeCheck from 'ip-range-check';
import _ from 'lodash';
import querystring from 'querystring';
import validator from 'validator';

import log from '@/logger';
import Runtime from '@/runtime/lib/Runtime';

export type APINodeData = Node.Api.NodeData['action_data'];
const PROHIBITED_IP_RANGES = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '127.0.0.0/8', '0.0.0.0/8', 'fd00::/8', '169.254.169.254/32'];

// Regex to match
const BLACKLISTED_URLS: RegExp[] = [];

const USER_AGENT = 'voiceflow-custom-api';

// Delay amount in ms for when max api call limit is reached
const THROTTLE_DELAY = 2000;

const stringToNumIfNumeric = (str: string): string | number => {
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

const validateUrl = async (urlString: string, runtime: Runtime) => {
  let url;
  try {
    url = new URL(urlString);
  } catch (err) {
    throw new VError(`url: ${urlString} could not be parsed`, VError.HTTP_STATUS.BAD_REQUEST);
  }

  const { hostname } = url;

  if (hostname.toLowerCase() === 'localhost') {
    throw new VError(`url hostname cannot be localhost: ${urlString}`, VError.HTTP_STATUS.BAD_REQUEST);
  }

  // DNS.resolve returns an array of ips
  const ips = validator.isIP(hostname)
    ? [hostname]
    : await DNS.resolve(hostname).catch(() => {
        throw new VError(`cannot resolve hostname: ${hostname}`, VError.HTTP_STATUS.BAD_REQUEST);
      });

  PROHIBITED_IP_RANGES.forEach((prohibitedRange) => {
    ips.forEach((ip) => {
      if (ipRangeCheck(ip, prohibitedRange)) {
        throw new VError(`url resolves to IP: ${ip} in prohibited range`, VError.HTTP_STATUS.BAD_REQUEST);
      }
    });
  });

  if (await runtime.outgoingApiLimiter.addHostnameUseAndShouldThrottle(hostname)) {
    // if the use of the hostname is high, delay the api call but let it happen
    await new Promise((resolve) => setTimeout(resolve, THROTTLE_DELAY));
  }
};

// eslint-disable-next-line sonarjs/cognitive-complexity
export const getResponse = async (data: APINodeData, runtime: Runtime) => {
  const { method, bodyInputType, headers, body, params, url } = data;

  let content;
  try {
    content = JSON.parse(data.content);
  } catch (e) {
    ({ content } = data);
  }

  BLACKLISTED_URLS.forEach((regex) => {
    if (regex.test(url)) {
      throw new VError('url endpoint is blacklisted', VError.HTTP_STATUS.BAD_REQUEST);
    }
  });

  const options: Record<string, any> = {
    method,
    url,
    // If the request takes longer than `timeout` in ms, the request will be aborted
    timeout: 29000,
    // defines the max size of the http response content in bytes allowed in node.js
    maxContentLength: 2000,
    // defines the max size of the http request content in bytes allowed
    maxBodyLength: 2000,
  };
  await validateUrl(url, runtime);

  if (params && params.length > 0) {
    const formattedParams: Record<string, any> = {};
    params.forEach((p) => {
      if (p.key) {
        formattedParams[p.key] = p.val;
      }
    });
    if (!_.isEmpty(formattedParams)) options.params = formattedParams;
  }

  if (headers && headers.length > 0) {
    const formattedHeaders: Record<string, any> = {};
    headers.forEach((h) => {
      if (h.key) {
        formattedHeaders[h.key] = h.val;
      }
    });
    if (!_.isEmpty(formattedHeaders)) options.headers = formattedHeaders;
  }
  if (!options.headers) options.headers = {};

  if (method !== 'GET') {
    let formattedData: any;
    // bodyInputType is no longer used in new integration blocks, but needs to be kept around until the old ones are migrated
    if (bodyInputType === 'rawInput') {
      formattedData = content;
    } else if (bodyInputType === 'formData') {
      const bodyForm = body.filter((b) => b.key);
      if (bodyForm.length) {
        formattedData = new FormData();
        bodyForm.forEach((b) => formattedData.append(b.key, b.val));
        options.headers = { ...options.headers, ...formattedData.getHeaders() };
      }
    } else if (bodyInputType === 'urlEncoded') {
      if (Array.isArray(body)) {
        const tempObj: Record<string, any> = {};
        body.forEach((b) => {
          if (b.key) {
            tempObj[b.key] = b.val;
          }
        });
        formattedData = querystring.stringify(tempObj);
      } else {
        formattedData = querystring.stringify(body);
      }
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    } else if (typeof body === 'string') {
      formattedData = body;
    } else if (bodyInputType === 'keyValue' || Array.isArray(body)) {
      formattedData = {};
      body.forEach((b) => {
        if (b.key) {
          formattedData[b.key] = b.val;
        }
      });
    }
    options.data = formattedData;
  }

  options.validateStatus = () => true;
  if (!options.headers['User-Agent']) {
    options.headers['User-Agent'] = USER_AGENT;
  }

  const response = await axios(options);

  if (_.isObject(response.data)) {
    // @ts-expect-error assigned kvp thats not a part of type
    response.data.VF_STATUS_CODE = response.status;
    // @ts-expect-error assigned kvp thats not a part of type
    response.data.VF_HEADERS = response.headers;
  }

  return { data: response.data, headers: response.headers, status: response.status };
};

export const makeAPICall = async (data: APINodeData, runtime: Runtime) => {
  try {
    const response = await getResponse(data, runtime);
    const newVariables: Record<string, any> = {};
    if (data.mapping) {
      data.mapping.forEach((m) => {
        if (m.var) {
          newVariables[m.var] = getVariable(m.path, response.data);
        }
      });
    }
    return { variables: newVariables, response };
  } catch (e) {
    log.info(e.stack);
    throw new Error();
  }
};
