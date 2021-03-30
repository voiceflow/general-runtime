import { expect } from 'chai';
import sinon from 'sinon';

import SessionManager from '@/lib/services/session/mongo';

describe('mongo sessionManager unit tests', async () => {
  afterEach(() => sinon.restore());

  it('enabled', () => {
    expect(SessionManager.enabled({ SESSIONS_SOURCE: 'mongo' } as any)).to.eql(true);
    expect(SessionManager.enabled({ SESSIONS_SOURCE: 'dynamo' } as any)).to.eql(false);
  });

  describe('saveToDb', () => {
    it('throws', async () => {
      const updateOne = sinon.stub().resolves({ result: { ok: false } });
      const state = new SessionManager({ mongo: { db: { collection: sinon.stub().returns({ updateOne }) } } } as any, {} as any);

      await expect(state.saveToDb('user-id', { foo: 'bar' } as any)).to.eventually.rejectedWith('store runtime session error');
    });

    it('works', async () => {
      const updateOne = sinon.stub().resolves({ result: { ok: true } });
      const state = new SessionManager({ mongo: { db: { collection: sinon.stub().returns({ updateOne }) } } } as any, {} as any);

      const userID = 'user-id';
      const stateObj = { foo: 'bar' };
      await state.saveToDb(userID, stateObj as any);

      const id = `${SessionManager.GENERAL_SESSIONS_MONGO_PREFIX}.${userID}`;
      expect(updateOne.args).to.eql([[{ id }, { $set: { id, attributes: stateObj } }, { upsert: true }]]);
    });
  });

  describe('getFromDb', () => {
    it('no user id', async () => {
      const state = new SessionManager({ mongo: {} } as any, {} as any);

      expect(await state.getFromDb(null as any)).to.eql({});
    });

    it('not found', async () => {
      const findOne = sinon.stub().resolves(null);
      const state = new SessionManager({ mongo: { db: { collection: sinon.stub().returns({ findOne }) } } } as any, {} as any);

      expect(await state.getFromDb('user-id')).to.eql({});
    });

    it('works', async () => {
      const attributes = { foo: 'bar' };
      const findOne = sinon.stub().resolves({ attributes });
      const state = new SessionManager({ mongo: { db: { collection: sinon.stub().returns({ findOne }) } } } as any, {} as any);

      expect(await state.getFromDb('user-id')).to.eql(attributes);
    });
  });
});
