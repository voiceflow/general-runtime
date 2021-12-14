import { Node } from '@voiceflow/base-types';
import { expect } from 'chai';
import FormData from 'form-data';
import querystring from 'querystring';
import sinon from 'sinon';

import { formatRequestConfig, getVariable, ReduceKeyValue, stringToNumIfNumeric } from '@/runtime/lib/Handlers/api/utils';

import { baseData, baseOptions } from './fixture';

describe('Handlers api utils unit tests', () => {
  describe('stringToNumIfNumeric', () => {
    it('returns single digit number', () => {
      expect(stringToNumIfNumeric('1')).to.eql(1);
    });

    it('returns 15 digit number', () => {
      expect(stringToNumIfNumeric('123456789123456')).to.eql(123456789123456);
    });

    it('returns 16 character string number', () => {
      expect(stringToNumIfNumeric('1234567891234567')).to.eql('1234567891234567');
    });

    it('returns same string', () => {
      expect(stringToNumIfNumeric('123abc')).to.eql('123abc');
    });

    it('returns undefined', () => {
      expect(stringToNumIfNumeric(undefined as any)).to.eql(undefined);
    });

    it('returns same object', () => {
      expect(stringToNumIfNumeric({ foo: 'bar' } as any)).to.eql({ foo: 'bar' });
    });
  });

  describe('getVariable', () => {
    it('returns undefined if path is empty string', () => {
      expect(getVariable('', {})).to.eql(undefined);
    });

    it('returns undefined if path is a number', () => {
      expect(getVariable(5 as any, {})).to.eql(undefined);
    });
  });

  describe('ReduceKeyValue', () => {
    it('works', () => {
      const arr = [
        { key: 'key1', val: 'value1' },
        { key: 'key2', val: 'value2' },
        { key: 'key3', val: 'value3' },
        { key: 'key1', val: 'value4' },
        { key: '', val: 'value5' },
      ];

      expect(ReduceKeyValue(arr)).to.eql({
        key1: 'value4',
        key2: 'value2',
        key3: 'value3',
      });
    });
  });

  describe('formatRequestConfig', () => {
    afterEach(() => {
      sinon.restore();
    });
    describe('get method', () => {
      it('raw input body type', async () => {
        const data = {
          ...baseData,
          method: Node.Api.APIMethod.GET,
          bodyInputType: Node.Api.APIBodyType.RAW_INPUT,
        };

        const { validateStatus, ...rest } = await formatRequestConfig(data as any);
        expect(rest).to.eql({
          ...baseOptions,
          method: data.method,
          headers: { header1: baseOptions.headers.header1 },
        });
      });

      it('form data body type', async () => {
        const data = {
          ...baseData,
          method: Node.Api.APIMethod.GET,
          bodyInputType: Node.Api.APIBodyType.FORM_DATA,
        };

        const { validateStatus, ...rest } = await formatRequestConfig(data as any);
        expect(rest).to.eql({
          ...baseOptions,
          method: data.method,
          headers: { header1: baseOptions.headers.header1 },
        });
      });
    });

    describe('raw input body', () => {
      it('converts to json', async () => {
        const parseStub = sinon.stub(JSON, 'parse').returns('parsedJSON');
        const data = {
          ...baseData,
          bodyInputType: Node.Api.APIBodyType.RAW_INPUT,
        };

        const { validateStatus, ...rest } = await formatRequestConfig(data as any);
        expect(rest).to.eql({
          ...baseOptions,
          data: 'parsedJSON',
        });
        expect(parseStub.args).to.eql([[data.content]]);
      });

      it('catches error', async () => {
        const parseStub = sinon.stub(JSON, 'parse').throws('abc');
        const data = {
          ...baseData,
          bodyInputType: Node.Api.APIBodyType.RAW_INPUT,
        };

        const { validateStatus, ...rest } = await formatRequestConfig(data as any);
        expect(rest).to.eql({
          ...baseOptions,
          data,
        });
        expect(parseStub.args).to.eql([[data.content]]);
      });
    });

    describe('formdata body', () => {
      it('works', async () => {
        const formDataAppendSpy = sinon.spy(FormData.prototype, 'append');
        const formDataGetHeadersSpy = sinon.stub(FormData.prototype, 'getHeaders').returns({ someHeader: 'getHeadersReturn' as any });
        const data = {
          ...baseData,
          body: [
            { key: 'a', val: 'b' },
            { key: 'c', val: 'd' },
          ],
          bodyInputType: Node.Api.APIBodyType.FORM_DATA,
        };

        const { validateStatus, data: formDataObj, ...rest } = await formatRequestConfig(data as any);
        expect(rest).to.eql({
          ...baseOptions,
          headers: {
            ...baseOptions.headers,
            someHeader: 'getHeadersReturn',
          },
        });
        expect(formDataObj).to.be.instanceOf(FormData);
        expect(formDataAppendSpy.args).to.eql([
          ['a', 'b'],
          ['c', 'd'],
        ]);
      });
    });

    describe('string body', () => {
      it('works', async () => {
        const data = {
          ...baseData,
          bodyInputType: 'abdef',
          body: 'body-value',
        };

        const { validateStatus, ...rest } = await formatRequestConfig(data as any);
        expect(rest).to.eql({
          ...baseOptions,
          data: 'body-value',
        });
      });
    });

    describe('urlencoded body', () => {
      it('works for array body', async () => {
        const formDataGetHeadersSpy = sinon.stub(querystring, 'stringify').returns('querystring stringify');
        const data = {
          ...baseData,
          bodyInputType: Node.Api.APIBodyType.URL_ENCODED,
          body: [
            { key: 'body1', val: 'never' },
            { key: 'body1', val: 'bodyval' },
          ],
        };

        const { validateStatus, ...rest } = await formatRequestConfig(data as any);
        expect(rest).to.eql({
          ...baseOptions,
          data: 'querystring stringify',
          headers: {
            ...baseOptions.headers,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });
        expect(formDataGetHeadersSpy.args).to.eql([[{ body1: 'bodyval' }]]);
      });

      it('works for non array body', async () => {
        const formDataGetHeadersSpy = sinon.stub(querystring, 'stringify').returns('querystring stringify');
        const data = {
          ...baseData,
          bodyInputType: Node.Api.APIBodyType.URL_ENCODED,
          body: 'body-value',
        };

        const { validateStatus, ...rest } = await formatRequestConfig(data as any);
        expect(rest).to.eql({
          ...baseOptions,
          data: 'querystring stringify',
          headers: {
            ...baseOptions.headers,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });
        expect(formDataGetHeadersSpy.args).to.eql([['body-value']]);
      });
    });

    describe('keyvalue body', () => {
      it('works', async () => {
        const data = {
          ...baseData,
          bodyInputType: 'keyValue',
          body: [
            { key: 'body1', val: 'never' },
            { key: 'body1', val: 'bodyval' },
          ],
        };

        const { validateStatus, ...rest } = await formatRequestConfig(data as any);
        expect(rest).to.eql({
          ...baseOptions,
          data: { body1: 'bodyval' },
        });
      });
    });

    it('does key value if other body and body is array', async () => {
      const data = {
        ...baseData,
        bodyInputType: 'some-body',
        body: [
          { key: 'body1', val: 'never' },
          { key: 'body1', val: 'bodyval' },
        ],
      };

      const { validateStatus, ...rest } = await formatRequestConfig(data as any);
      expect(rest).to.eql({
        ...baseOptions,
        data: { body1: 'bodyval' },
      });
    });

    it('returns basic options if bodytype is not raw,formdata,urlenc,keyValue and body is not array', async () => {
      const data = {
        ...baseData,
        bodyInputType: 'abcdef',
        body: {},
      };

      const { validateStatus, ...rest } = await formatRequestConfig(data as any);
      expect(rest).to.eql({
        ...baseOptions,
      });
    });
  });
});
