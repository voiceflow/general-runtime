import { expect } from 'chai';
import { ObjectId } from 'mongodb';
import sinon from 'sinon';

import MongoDataAPI from '@/runtime/lib/DataAPI/mongoDataAPI';

const MOCK_RETURN_VALUE = { object: 'mock-return-value' };
const MOCK_ID = '000000000000000000000000';
const MOCK_QUERY = { _id: new ObjectId(MOCK_ID) };

const VERSION_ID = '111111111111111111111111';
const DIAGRAM_ID = '222222222222222222222222';

const MOCK_PROGRAM_QUERY = { versionID: new ObjectId(VERSION_ID), diagramID: new ObjectId(DIAGRAM_ID) };

const mockClient = () => {
  const collection = { findOne: sinon.stub().resolves(MOCK_RETURN_VALUE) };
  const client = { db: { collection: sinon.stub().returns(collection) } } as any;
  const api = new MongoDataAPI(client);

  return { client, collection, api };
};

describe('mongoDataAPI client unit tests', () => {
  it('getProgram', async () => {
    const { api, client, collection } = mockClient();

    expect(await api.getProgram(VERSION_ID, DIAGRAM_ID)).to.eql(MOCK_RETURN_VALUE);
    expect(client.db.collection.args).to.eql([['programs']]);
    expect(collection.findOne.args).to.eql([[MOCK_PROGRAM_QUERY]]);
  });

  it('getVersion', async () => {
    const { api, client, collection } = mockClient();

    expect(await api.getVersion(MOCK_ID)).to.eql(MOCK_RETURN_VALUE);
    expect(client.db.collection.args).to.eql([['versions']]);
    expect(collection.findOne.args).to.eql([[MOCK_QUERY]]);
  });

  it('getProject', async () => {
    const { api, client, collection } = mockClient();

    expect(await api.getProject(MOCK_ID)).to.eql(MOCK_RETURN_VALUE);
    expect(client.db.collection.args).to.eql([['projects']]);
    expect(collection.findOne.args).to.eql([[MOCK_QUERY]]);
  });

  it('overrides collection names', async () => {
    const { api, client, collection } = mockClient();

    (api as any).programsCollection = 'custom-programs';
    (api as any).versionsCollection = 'custom-versions';
    (api as any).projectsCollection = 'custom-projects';

    expect(await api.getProgram(VERSION_ID, DIAGRAM_ID)).to.eql(MOCK_RETURN_VALUE);
    expect(await api.getVersion(MOCK_ID)).to.eql(MOCK_RETURN_VALUE);
    expect(await api.getProject(MOCK_ID)).to.eql(MOCK_RETURN_VALUE);

    expect(client.db.collection.args).to.eql([['custom-programs'], ['custom-versions'], ['custom-projects']]);
    expect(collection.findOne.args).to.eql([[MOCK_PROGRAM_QUERY], [MOCK_QUERY], [MOCK_QUERY]]);
  });

  it('throws error on null find', async () => {
    const { api, collection } = mockClient();

    collection.findOne.resolves(null);

    await expect(api.getProgram(VERSION_ID, DIAGRAM_ID)).to.be.rejectedWith(Error);
    await expect(api.getVersion(MOCK_ID)).to.be.rejectedWith(Error);
    await expect(api.getProject(MOCK_ID)).to.be.rejectedWith(Error);
  });
});
