import { expect } from 'chai';
import sinon from 'sinon';

import SessionManager from '@/lib/services/session/local';

describe('local sessionManager unit tests', async () => {
  afterEach(() => sinon.restore());

  describe('saveToDb', () => {
    it('works', async () => {
      const state = new SessionManager({} as any, {} as any);

      const userID = 'user-id';
      const stateObj = { foo: 'bar' };
      await state.saveToDb(userID, stateObj as any);

      expect(state.table).to.eql({ [userID]: stateObj });
    });
  });

  describe('getFromDb', () => {
    it('no user id', async () => {
      const state = new SessionManager({ mongo: {} } as any, {} as any);

      expect(await state.getFromDb(null as any)).to.eql({});
    });

    it('not found', async () => {
      const state = new SessionManager({} as any, {} as any);

      expect(await state.getFromDb('user-id')).to.eql({});
    });

    it('works', async () => {
      const userID = 'user-id';
      const stateObj = { foo: 'bar' };
      const state = new SessionManager({} as any, {} as any);
      state.table[userID] = stateObj;

      expect(await state.getFromDb(userID)).to.eql(stateObj);
    });
  });
});
