import { Node } from '@voiceflow/base-types';
import axios, { AxiosRequestConfig } from 'axios';
import FormData from 'form-data';
import _ from 'lodash';
import querystring from 'querystring';

export type APINodeData = Node.Api.NodeData['action_data'];

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

const ReduceKeyValue = (values: { key: string; val: string }[]) =>
  values.reduce<Record<string, string>>((acc, { key, val }) => {
    if (key) {
      acc[key] = val;
    }
    return acc;
  }, {});

const formatRequestConfig = (data: APINodeData) => {
  const { method, bodyInputType, headers, body, params, url, content } = data;

  const options: AxiosRequestConfig = {
    method,
    url,
    timeout: 29000, // REQ_TIMEOUT_SEC
  };

  if (params?.length > 0) {
    const formattedParams = ReduceKeyValue(params);
    if (!_.isEmpty(formattedParams)) options.params = formattedParams;
  }

  if (headers && headers.length > 0) {
    const formattedHeaders = ReduceKeyValue(headers);
    if (!_.isEmpty(formattedHeaders)) options.headers = formattedHeaders;
  }
  if (!options.headers) options.headers = {};

  options.validateStatus = () => true;

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

  return options;
};

export const makeAPICall = async (nodeData: APINodeData) => {
  const requestConfig = formatRequestConfig(nodeData);

  const { data, headers, status } = await axios(requestConfig);

  if (_.isObject(data) as any) {
    data.VF_STATUS_CODE = status;
    data.VF_HEADERS = headers;
  }

  const newVariables: Record<string, any> = {};
  if (nodeData.mapping) {
    nodeData.mapping.forEach((m) => {
      if (m.var) {
        newVariables[m.var] = getVariable(m.path, data);
      }
    });
  }
  return { variables: newVariables, response: { data, headers, status } };
};
