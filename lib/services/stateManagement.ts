import { Config } from '@voiceflow/general-types';
import _ from 'lodash';

import { RuntimeRequest } from '@/lib/services/runtime/types';
import { State } from '@/runtime';

import { AbstractManager } from './utils';

class StateManagement extends AbstractManager {
  async interact(data: {
    params: { versionID: string; userID: string };
    body: { state?: State; request?: RuntimeRequest; config?: Config };
    query: { locale?: string; verbose?: boolean };
    headers: { authorization: string; project_id: string };
  }) {
    let state = await this.services.session.getFromDb<State>(data.headers.project_id, data.params.userID);
    if (_.isEmpty(state)) {
      state = await this.reset(data);
    }

    data.body.state = state;

    const { state: updatedState, trace, request } = await this.services.interact.handler(data);

    await this.services.session.saveToDb(data.headers.project_id, data.params.userID, updatedState);

    return data.query.verbose ? { state: updatedState, trace, request } : trace;
  }

  async reset(data: { headers: { authorization: string; project_id: string }; params: { versionID: string; userID: string } }) {
    const state = await this.services.interact.state(data);
    await this.services.session.saveToDb(data.headers.project_id, data.params.userID, state);
    return state;
  }
}

export default StateManagement;
