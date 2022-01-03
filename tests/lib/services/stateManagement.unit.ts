import { expect } from 'chai';
import _ from 'lodash';
import sinon from 'sinon';

import StateManagement from '@/lib/services/stateManagement';

describe('stateManagement manager unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('interact', () => {
    it('with state', async () => {
      const session = { foo: 'bar' };
      const handlerResult = { state: { foo: 'bar2' }, trace: ['trace1', 'trace2', 'trace3'] };
      const services = {
        session: { getFromDb: sinon.stub().resolves(session), saveToDb: sinon.stub() },
        interact: { handler: sinon.stub().resolves(handlerResult) },
      };
      const service = new StateManagement(services as any, {} as any);

      const data = { params: { userID: 'user-id' }, body: {}, headers: { projectID: 'project-id', versionID: 'version-id' }, query: {} };

      expect(await service.interact(data as any)).to.eql(handlerResult.trace);

      expect(services.session.getFromDb.args).to.eql([[data.headers.projectID, data.params.userID]]);
      expect(_.get(data.body, 'state')).to.eql(session);
      expect(services.interact.handler.args).to.eql([[data]]);
      expect(services.session.saveToDb.args).to.eql([[data.headers.projectID, data.params.userID, handlerResult.state]]);
    });

    it('no state', async () => {
      const session = {};
      const newSession = { foo: 'bar' };
      const handlerResult = { state: { foo: 'bar2' }, trace: ['trace1', 'trace2', 'trace3'] };
      const services = {
        session: { getFromDb: sinon.stub().resolves(session), saveToDb: sinon.stub() },
        interact: { handler: sinon.stub().resolves(handlerResult) },
      };
      const service = new StateManagement(services as any, {} as any);
      const resetStub = sinon.stub().resolves(newSession);
      service.reset = resetStub;

      const data = { params: { userID: 'user-id' }, body: {}, headers: { projectID: 'project-id', versionID: 'version-id' }, query: {} };

      expect(await service.interact(data as any)).to.eql(handlerResult.trace);

      expect(services.session.getFromDb.args).to.eql([[data.headers.projectID, data.params.userID]]);
      expect(resetStub.args).to.eql([[data]]);
      expect(_.get(data.body, 'state')).to.eql(newSession);
      expect(services.interact.handler.args).to.eql([[data]]);
      expect(services.session.saveToDb.args).to.eql([[data.headers.projectID, data.params.userID, handlerResult.state]]);
    });

    it('with state, verbose response', async () => {
      const session = { foo: 'bar' };
      const handlerResult = { state: { foo: 'bar2' }, trace: ['trace1', 'trace2', 'trace3'], request: { foo: 'bar3' } };
      const services = {
        session: { getFromDb: sinon.stub().resolves(session), saveToDb: sinon.stub() },
        interact: { handler: sinon.stub().resolves(handlerResult) },
      };
      const service = new StateManagement(services as any, {} as any);

      const data = {
        params: { userID: 'user-id', versionID: 'version-id' },
        body: {},
        headers: { projectID: 'project-id' },
        query: { verbose: true },
      };

      expect(await service.interact(data as any)).to.eql(handlerResult);

      expect(services.session.getFromDb.args).to.eql([[data.headers.projectID, data.params.userID]]);
      expect(_.get(data.body, 'state')).to.eql(session);
      expect(services.interact.handler.args).to.eql([[data]]);
      expect(services.session.saveToDb.args).to.eql([[data.headers.projectID, data.params.userID, handlerResult.state]]);
    });

    it('no state, verbose response', async () => {
      const session = {};
      const newSession = { foo: 'bar' };
      const handlerResult = { state: { foo: 'bar2' }, trace: ['trace1', 'trace2', 'trace3'], request: { foo: 'bar3' } };
      const services = {
        session: { getFromDb: sinon.stub().resolves(session), saveToDb: sinon.stub() },
        interact: { handler: sinon.stub().resolves(handlerResult) },
      };
      const service = new StateManagement(services as any, {} as any);
      const resetStub = sinon.stub().resolves(newSession);
      service.reset = resetStub;

      const data = {
        params: { userID: 'user-id' },
        body: {},
        headers: { projectID: 'project-id', versionID: 'version-id' },
        query: { verbose: true },
      };

      expect(await service.interact(data as any)).to.eql(handlerResult);

      expect(services.session.getFromDb.args).to.eql([[data.headers.projectID, data.params.userID]]);
      expect(resetStub.args).to.eql([[data]]);
      expect(_.get(data.body, 'state')).to.eql(newSession);
      expect(services.interact.handler.args).to.eql([[data]]);
      expect(services.session.saveToDb.args).to.eql([[data.headers.projectID, data.params.userID, handlerResult.state]]);
    });
  });

  describe('reset', () => {
    it('works', async () => {
      const session = { foo: 'bar' };
      const services = {
        session: { saveToDb: sinon.stub() },
        interact: { state: sinon.stub().resolves(session) },
      };
      const service = new StateManagement(services as any, {} as any);

      const data = { params: { userID: 'user-id' }, body: {}, headers: { projectID: 'project-id', versionID: 'version-id' } };

      expect(await service.reset(data as any)).to.eql(session);

      expect(services.interact.state.args).to.eql([[data]]);
      expect(services.session.saveToDb.args).to.eql([[data.headers.projectID, data.params.userID, session]]);
    });
  });
});
