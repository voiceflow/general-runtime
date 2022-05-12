import { expect } from 'chai';
import sinon from 'sinon';

import * as Ingest from '@/ingest';

describe('Ingest client', () => {
  describe('Do ingest', () => {
    it('works', async () => {
      const client = Ingest.Client('https://localhost', 'api key');
      const body = { data: { hello: 'world' } };

      const axios = {
        post: sinon.stub().returns('axios response'),
      };

      (client as any).axios = axios;

      expect(await client.doIngest(body as any)).to.eql('axios response');

      expect(axios.post.callCount).to.eql(1);
      expect(axios.post.getCall(0).args).to.deep.eq(['/logs/ingest', body]);
    });
  });
});
