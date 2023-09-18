import { expect } from 'chai';
import { ObjectId } from 'mongodb';
import sinon from 'sinon';

import PrototypeDataAPI from '@/lib/clients/prototypeDataAPI';

describe('prototypeDataAPI client unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('getProgram', async () => {
    const mockProgramValue = { program: 'get-program-mock-return-value' };

    const mockProgramCollection = {
      findOne: sinon.stub().resolves(mockProgramValue),
    };
    const mongoClient = { db: { collection: sinon.stub().returns(mockProgramCollection) } };
    const versionID = '000000000000000000000000';
    const diagramID = '111111111111111111111111';

    const client = new PrototypeDataAPI(mongoClient as any);

    expect(await client.getProgram(versionID, diagramID)).to.eql(mockProgramValue);
    expect(mongoClient.db.collection.args).to.eql([['prototype-programs']]);
    expect(mockProgramCollection.findOne.args).to.eql([
      [{ diagramID: new ObjectId(diagramID), versionID: new ObjectId(versionID) }],
    ]);
  });
});
