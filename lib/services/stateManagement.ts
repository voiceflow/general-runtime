import { BaseRequest } from '@voiceflow/base-types';
import _ from 'lodash';

import { RuntimeRequest } from '@/lib/services/runtime/types';
import { State } from '@/runtime';
import { PredictionStage } from '@/types';

import { AbstractManager } from './utils';

class StateManagement extends AbstractManager {
  async interact(data: {
    params: { userID: string };
    body: { state?: State; action?: RuntimeRequest; request?: RuntimeRequest; config?: BaseRequest.RequestConfig };
    query: { locale?: string; verbose?: boolean };
    headers: { authorization: string; projectID: string; versionID: string; stage: PredictionStage };
  }) {
    let state = await this.services.session.getFromDb<State>(data.headers.projectID, data.params.userID);
    if (_.isEmpty(state)) {
      state = await this.reset(data);
    }

    data.body.state = state;

    const { state: updatedState, trace, request } = await this.services.interact.handler(data);

    await this.services.session.saveToDb(data.headers.projectID, data.params.userID, updatedState);

    return data.query.verbose ? { state: updatedState, trace, request } : trace;
  }

  async reset(data: {
    headers: { authorization: string; projectID: string; versionID: string };
    params: { userID: string };
  }) {
    const state = await this.services.interact.state(data);
    await this.services.session.saveToDb(data.headers.projectID, data.params.userID, state);
    return state;
  }
}

export default StateManagement;
