import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';

import { PromptWrapper } from '@/lib/services/extraction/prompt-wrapper/prompt-wrapper.class';

chai.use(chaiAsPromised);
const { expect } = chai;

const GENERAL_SERVICE_ENDPOINT = 'http://localhost:6970';
const defaultConfig = {
  GENERAL_SERVICE_ENDPOINT,
  CLOUD_ENV: '',
  NLU_GATEWAY_SERVICE_URI: '',
  NLU_GATEWAY_SERVICE_PORT_APP: '',
};

describe.skip('prompt wrapper unit tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  const setup = () => ({
    config: {
      ...defaultConfig,
      mlGateway: {
        private: {
          completion: {
            generateCompletion: sinon.stub().resolves({ test: 'beans' }),
          },
        },
      },
    },
  });

  it('works with openSlot false', async () => {
    const utterance = 'query-val';
    const { config } = setup();

    const expectedResult = {};
    const expectedSideEffects = {};

    const promptWrapper = new PromptWrapper(config).withUtterance(utterance);

    const [result, sideEffects] = await promptWrapper.exec();

    expect(result).to.eql(expectedResult);
    expect(sideEffects).to.eql(expectedSideEffects);
  });
});
