import { BaseNode } from '@voiceflow/base-types';
import { expect } from 'chai';
import FormData from 'form-data';
import sinon, { SinonSandbox } from 'sinon';

import { createRequest, getVariable, ReduceKeyValue, stringToNumIfNumeric } from '@/runtime/lib/Handlers/api/utils';

describe('Handlers api utils unit tests', () => {
  let sandbox: SinonSandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();

    sandbox.stub(FormData.prototype, 'getBoundary').returns('--------------------------aaaaaaaaaaaaaaaaaaaaaaaa');
  });

  afterEach(() => {
    sandbox.restore();
  });

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

  describe('createRequest', () => {
    it('works with GET requests', async () => {
      const request = await createRequest(
        {
          url: 'https://example.com/?a=1',
          method: BaseNode.Api.APIMethod.GET,
          bodyInputType: BaseNode.Api.APIBodyType.RAW_INPUT,
          content: 'my body',
          headers: [{ key: 'My-Header', val: 'My-Value' }],
          params: [
            { key: 'b', val: '2' },
            { key: 'c', val: '3' },
          ],
        } as any,
        {} as any
      );

      expect(request.method).to.eql('GET');
      expect(request.url).to.eql('https://example.com/?a=1&b=2&c=3');
      // No body should be included in GET requests
      await expect(request.text()).to.eventually.eql('');
      expect(request.headers.get('My-Header')).to.equal('My-Value');
    });
    it('works with POST requests with raw body', async () => {
      const request = await createRequest(
        {
          url: 'https://example.com/?a=1',
          method: BaseNode.Api.APIMethod.POST,
          bodyInputType: BaseNode.Api.APIBodyType.RAW_INPUT,
          content: 'my body',
          headers: [{ key: 'My-Header', val: 'My-Value' }],
          params: [
            { key: 'b', val: '2' },
            { key: 'c', val: '3' },
          ],
        } as any,
        {} as any
      );

      expect(request.method).to.eql('POST');
      expect(request.url).to.eql('https://example.com/?a=1&b=2&c=3');
      await expect(request.text()).to.eventually.eql('my body');
      expect(request.headers.get('My-Header')).to.equal('My-Value');
    });
    it('works with POST requests with URL encoded body', async () => {
      const request = await createRequest(
        {
          url: 'https://example.com/?a=1',
          method: BaseNode.Api.APIMethod.POST,
          bodyInputType: BaseNode.Api.APIBodyType.URL_ENCODED,
          body: [
            { key: 'd', val: '4' },
            { key: 'e', val: '5' },
          ],
          headers: [
            { key: 'My-Header', val: 'My-Value' },
            { key: 'Content-Type', val: 'My-Value' },
          ],
          params: [
            { key: 'b', val: '2' },
            { key: 'c', val: '3' },
          ],
        } as any,
        {} as any
      );

      expect(request.method).to.eql('POST');
      expect(request.url).to.eql('https://example.com/?a=1&b=2&c=3');
      await expect(request.text()).to.eventually.eql('d=4&e=5');
      expect(request.headers.get('My-Header')).to.equal('My-Value');
      expect(request.headers.get('Content-Type')).to.equal('application/x-www-form-urlencoded');
    });
    it('works with POST requests with form data body', async () => {
      const request = await createRequest(
        {
          url: 'https://example.com/?a=1',
          method: BaseNode.Api.APIMethod.POST,
          bodyInputType: BaseNode.Api.APIBodyType.FORM_DATA,
          body: [
            { key: 'd', val: '4' },
            { key: 'e', val: '5' },
          ],
          headers: [
            { key: 'My-Header', val: 'My-Value' },
            { key: 'Content-Type', val: 'My-Value' },
          ],
          params: [
            { key: 'b', val: '2' },
            { key: 'c', val: '3' },
          ],
        } as any,
        {} as any
      );

      expect(request.method).to.eql('POST');
      expect(request.url).to.eql('https://example.com/?a=1&b=2&c=3');
      const formData = new FormData();
      formData.append('d', '4');
      formData.append('e', '5');

      // @ts-expect-error node-fetch types are wrong
      delete (request.body as FormData)._events;
      // @ts-expect-error node-fetch types are wrong
      delete (request.body as FormData)._eventsCount;

      // node-fetch types are wrong
      expect((request.body as FormData).getBuffer()).to.eql(formData.getBuffer());
      expect(request.headers.get('My-Header')).to.equal('My-Value');
      expect(request.headers.get('Content-Type')).to.equal(
        'multipart/form-data; boundary=--------------------------aaaaaaaaaaaaaaaaaaaaaaaa'
      );
    });

    it('works with DELETE requests', async () => {
      const request = await createRequest(
        {
          url: 'https://example.com/?a=1',
          method: BaseNode.Api.APIMethod.DELETE,
          bodyInputType: BaseNode.Api.APIBodyType.FORM_DATA,
          body: [
            { key: 'd', val: '4' },
            { key: 'e', val: '5' },
          ],
          headers: [
            { key: 'My-Header', val: 'My-Value' },
            { key: 'Content-Type', val: 'My-Value' },
          ],
          params: [
            { key: 'b', val: '2' },
            { key: 'c', val: '3' },
          ],
        } as any,
        {} as any
      );

      expect(request.method).to.eql('DELETE');
      expect(request.url).to.eql('https://example.com/?a=1&b=2&c=3');
      const formData = new FormData();
      formData.append('d', '4');
      formData.append('e', '5');

      // @ts-expect-error node-fetch types are wrong
      delete (request.body as FormData)._events;
      // @ts-expect-error node-fetch types are wrong
      delete (request.body as FormData)._eventsCount;

      // node-fetch types are wrong
      expect((request.body as FormData).getBuffer()).to.eql(formData.getBuffer());
      expect(request.headers.get('My-Header')).to.equal('My-Value');
      expect(request.headers.get('Content-Type')).to.equal(
        'multipart/form-data; boundary=--------------------------aaaaaaaaaaaaaaaaaaaaaaaa'
      );
    });
  });
});
