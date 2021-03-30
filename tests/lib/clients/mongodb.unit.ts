import { expect } from 'chai';
import _ from 'lodash';
import { MongoClient } from 'mongodb';
import sinon from 'sinon';

import MongoDb from '@/lib/clients/mongodb';

describe('mongodb client unit tests', () => {
  beforeEach(() => {
    sinon.restore();
  });

  it('start', async () => {
    const dbObj = { foo: 'bar' };
    const client = { close: sinon.stub(), db: sinon.stub().returns(dbObj) };
    const connectStub = sinon.stub(MongoClient, 'connect');
    connectStub.resolves(client);

    const MONGO_URI = 'mongo-uri';
    const mongoDb = new MongoDb({ MONGO_URI } as any);

    await mongoDb.start();

    expect(connectStub.args).to.eql([[MONGO_URI, { useUnifiedTopology: true }]]);
    expect(mongoDb.db).to.eql(dbObj);
  });

  describe('db', () => {
    it('undefined', () => {
      const mongoDb = new MongoDb({} as any);

      expect(() => {
        const dbObj = mongoDb.db;
      }).to.throw('DB is undefined. start client first');
    });

    it('defined', () => {
      const dbObj = { foo: 'bar' };
      const mongoDb = new MongoDb({} as any);
      _.set(mongoDb, '_db', dbObj);

      expect(mongoDb.db).to.eql(dbObj);
    });
  });

  it('stop', async () => {
    const client = { close: sinon.stub() };

    const mongoDb = new MongoDb({} as any);
    _.set(mongoDb, 'client', client);

    await mongoDb.stop();

    expect(client.close.callCount).to.eql(1);
  });
});
