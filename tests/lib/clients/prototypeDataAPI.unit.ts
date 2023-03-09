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
    const mongoClient = { collection: sinon.stub().returns(mockProgramCollection) };
    const arg = '000000000000000000000000';

    const client = new PrototypeDataAPI({ client: mongoClient } as any);

    expect(await client.getProgram(arg)).to.eql(mockProgramValue);
    expect(mongoClient.collection.args).to.eql([['prototype-programs']]);
    expect(mockProgramCollection.findOne.args).to.eql([[{ _id: new ObjectId(arg) }]]);
  });
});
