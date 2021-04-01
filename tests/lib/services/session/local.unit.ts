import { expect } from 'chai';
import sinon from 'sinon';

import SessionManager from '@/lib/services/session/local';

describe('local sessionManager unit tests', async () => {
  afterEach(() => sinon.restore());

  describe('saveToDb', () => {
    it('works', async () => {
      const state = new SessionManager({} as any, {} as any);

      const userID = 'user-id';
      const projectID = 'project-id';
      const stateObj = { foo: 'bar' };
      await state.saveToDb(projectID, userID, stateObj as any);

      expect(state.table).to.eql({ [`${projectID}.${userID}`]: stateObj });
    });
  });

  describe('getFromDb', () => {
    it('not found', async () => {
      const state = new SessionManager({} as any, {} as any);

      expect(await state.getFromDb('project-id', 'user-id')).to.eql({});
    });

    it('works', async () => {
      const projectID = 'project-id';
      const userID = 'user-id';
      const stateObj = { foo: 'bar' };
      const state = new SessionManager({} as any, {} as any);
      state.table[`${projectID}.${userID}`] = stateObj;

      expect(await state.getFromDb(projectID, userID)).to.eql(stateObj);
    });
  });

  describe('deleteFromDb', () => {
    it('works', async () => {
      const projectID = 'project-id';
      const userID = 'user-id';
      const stateObj = { foo: 'bar' };
      const state = new SessionManager({} as any, {} as any);
      state.table.foo = 'bar';
      state.table[`${projectID}.${userID}`] = stateObj;

      expect(state.table).to.eql({ foo: 'bar', [`${projectID}.${userID}`]: stateObj });
      await state.deleteFromDb(projectID, userID);
      expect(state.table).to.eql({ foo: 'bar' });
    });
  });
});
