import { expect } from 'chai';
import sinon from 'sinon';

import * as Ingest from '@/ingest';

describe('Ingest client', () => {
  describe('Ingest Interaction', () => {
    it('works', async () => {
      const client = Ingest.Client('https://localhost', 'api key');
      const body = { data: { hello: 'world' } };

      const axios = {
        post: sinon.stub().returns('axios response'),
      };

      (client as any).axios = axios;

      expect(await client.ingestInteraction(body as any)).to.eql('axios response');

      expect(axios.post.callCount).to.eql(1);
      expect(axios.post.getCall(0).args).to.deep.eq(['/transcripts/interaction', body]);
    });
  });

  describe('Ingest Trace', () => {
    it('works', async () => {
      const client = Ingest.Client('https://localhost', 'api key');
      const body = { data: { hello: 'world' } };

      const axios = {
        post: sinon.stub().returns('axios response'),
      };

      (client as any).axios = axios;

      expect(await client.ingestTrace('1234', body as any)).to.eql('axios response');

      expect(axios.post.callCount).to.eql(1);
      expect(axios.post.getCall(0).args).to.deep.eq(['/transcripts/interaction/1234/trace', body]);
    });
  });

  describe('Get Session Transcripts', () => {
    it('works', async () => {
      const client = Ingest.Client('https://localhost', 'api key');

      const axios = {
        get: sinon.stub().returns('axios response'),
      };

      (client as any).axios = axios;

      expect(await client.getSessionTranscripts('1234')).to.eql('axios response');

      expect(axios.get.callCount).to.eql(1);
      expect(axios.get.getCall(0).args).to.deep.eq(['/transcripts/session/1234']);
    });
  });

  describe('Get Session Transcripts Count', () => {
    it('works', async () => {
      const client = Ingest.Client('https://localhost', 'api key');

      const axios = {
        get: sinon.stub().returns('axios response'),
      };

      (client as any).axios = axios;

      expect(await client.getSessionTranscriptsCount('1234')).to.eql('axios response');

      expect(axios.get.callCount).to.eql(1);
      expect(axios.get.getCall(0).args).to.deep.eq(['/transcripts/session/1234/count']);
    });
  });
});
