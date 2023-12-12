import { expect } from 'chai';
import { ObjectId } from 'mongodb';
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
      const updateOne = sinon.stub().resolves({ acknowledged: false });
      const state = new SessionManager(
        { mongo: { db: { collection: sinon.stub().returns({ updateOne }) } } } as any,
        {} as any
      );

      await expect(
        state.saveToDb('60660078d1be7ef51a0be899', 'user-id', { foo: 'bar' } as any)
      ).to.eventually.rejectedWith('store runtime session error');
    });

    it('works', async () => {
      const updateOne = sinon.stub().resolves({ acknowledged: true });
      const state = new SessionManager(
        { mongo: { db: { collection: sinon.stub().returns({ updateOne }) } } } as any,
        {} as any
      );

      const projectID = '60660078d1be7ef51a0be899';
      const userID = 'user-id';
      const stateObj = { foo: 'bar' };
      await state.saveToDb(projectID, userID, stateObj as any);

      const id = `${SessionManager.GENERAL_SESSIONS_MONGO_PREFIX}.${projectID}.${userID}`;
      expect(updateOne.args).to.eql([
        [
          { id, projectID: new ObjectId(projectID) },
          { $set: { id, projectID: new ObjectId(projectID), attributes: stateObj } },
          { upsert: true },
        ],
      ]);
    });
  });

  describe('getFromDb', () => {
    it('not found', async () => {
      const findOne = sinon.stub().resolves(null);
      const state = new SessionManager(
        { mongo: { db: { collection: sinon.stub().returns({ findOne }) } } } as any,
        {} as any
      );

      expect(await state.getFromDb('60660078d1be7ef51a0be899', 'user-id')).to.eql({});
    });

    it('works', async () => {
      const attributes = { foo: 'bar' };
      const findOne = sinon.stub().resolves({ attributes });
      const state = new SessionManager(
        { mongo: { db: { collection: sinon.stub().returns({ findOne }) } } } as any,
        {} as any
      );

      const projectID = '60660078d1be7ef51a0be899';
      const userID = 'user-id';
      expect(await state.getFromDb(projectID, userID)).to.eql(attributes);
      expect(findOne.args).to.eql([
        [
          {
            projectID: new ObjectId(projectID),
            id: `${SessionManager.GENERAL_SESSIONS_MONGO_PREFIX}.${projectID}.${userID}`,
          },
        ],
      ]);
    });
  });

  describe('deleteFromDb', () => {
    it('not ok', async () => {
      const deleteOne = sinon.stub().resolves({ acknowledged: false });
      const state = new SessionManager(
        { mongo: { db: { collection: sinon.stub().returns({ deleteOne }) } } } as any,
        {} as any
      );

      const projectID = '60660078d1be7ef51a0be899';
      const userID = 'user-id';

      await expect(state.deleteFromDb(projectID, userID)).to.eventually.rejectedWith('delete runtime session error');
      expect(deleteOne.args).to.eql([
        [
          {
            projectID: new ObjectId(projectID),
            id: `${SessionManager.GENERAL_SESSIONS_MONGO_PREFIX}.${projectID}.${userID}`,
          },
        ],
      ]);
    });

    it('not deleted', async () => {
      const deleteOne = sinon.stub().resolves({ acknowledged: false, deletedCount: 0 });
      const state = new SessionManager(
        { mongo: { db: { collection: sinon.stub().returns({ deleteOne }) } } } as any,
        {} as any
      );

      const projectID = '60660078d1be7ef51a0be899';
      const userID = 'user-id';

      await expect(state.deleteFromDb(projectID, userID)).to.eventually.rejectedWith('delete runtime session error');
      expect(deleteOne.args).to.eql([
        [
          {
            projectID: new ObjectId(projectID),
            id: `${SessionManager.GENERAL_SESSIONS_MONGO_PREFIX}.${projectID}.${userID}`,
          },
        ],
      ]);
    });

    it('is idempotent', async () => {
      const deleteOne = sinon.stub().resolves({ acknowledged: true, deletedCount: 0 });
      const state = new SessionManager(
        { mongo: { db: { collection: sinon.stub().returns({ deleteOne }) } } } as any,
        {} as any
      );

      const projectID = '60660078d1be7ef51a0be899';
      const userID = 'user-id';

      await state.deleteFromDb(projectID, userID);
      expect(deleteOne.args).to.eql([
        [
          {
            projectID: new ObjectId(projectID),
            id: `${SessionManager.GENERAL_SESSIONS_MONGO_PREFIX}.${projectID}.${userID}`,
          },
        ],
      ]);
    });

    it('works', async () => {
      const deleteOne = sinon.stub().resolves({ acknowledged: true, deletedCount: 1 });
      const state = new SessionManager(
        { mongo: { db: { collection: sinon.stub().returns({ deleteOne }) } } } as any,
        {} as any
      );

      const projectID = '60660078d1be7ef51a0be899';
      const userID = 'user-id';

      await state.deleteFromDb(projectID, userID);
      expect(deleteOne.args).to.eql([
        [
          {
            projectID: new ObjectId(projectID),
            id: `${SessionManager.GENERAL_SESSIONS_MONGO_PREFIX}.${projectID}.${userID}`,
          },
        ],
      ]);
    });
  });
});
