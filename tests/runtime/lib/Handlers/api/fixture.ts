import { Node } from '@voiceflow/base-types';

export const baseData = {
  method: Node.Api.APIMethod.POST,
  bodyInputType: '',
  headers: [
    { key: 'header1', val: 'never' },
    { key: 'header1', val: 'headerval1' },
  ],
  body: [],
  params: [
    { key: 'param1', val: 'never' },
    { key: 'param1', val: 'paramval1' },
  ],
  url: 'https://www.mockurl.com',
  content: 'mock-content',
};

const timeout = 29000;
export const baseOptions = {
  headers: { header1: 'headerval1' },
  params: { param1: 'paramval1' },
  url: 'https://www.mockurl.com',
  method: Node.Api.APIMethod.POST,
  timeout,
  maxBodyLength: 100000,
  maxContentLength: 100000,
};
