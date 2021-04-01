import { Config } from '@voiceflow/general-types';
import { State } from '@voiceflow/runtime';
import _ from 'lodash';

import { RuntimeRequest } from '@/lib/services/runtime/types';

import { AbstractManager } from './utils';

class StateManagement extends AbstractManager {
  async interact(data: {
    params: { versionID: string; userID: string };
    body: { state?: State; request?: RuntimeRequest; config?: Config };
    query: { locale?: string };
    headers: { authorization: string; projectID: string };
  }) {
    let state = await this.services.session.getFromDb<State>(data.headers.projectID, data.params.userID);
    if (_.isEmpty(state)) {
      state = await this.reset(data);
    }

    data.body.state = state;

    const { state: updatedState, trace } = await this.services.interact.handler(data);

    await this.services.session.saveToDb(data.headers.projectID, data.params.userID, updatedState);

    return trace;
  }

  async reset(data: { headers: { authorization: string; projectID: string }; params: { versionID: string; userID: string } }) {
    const state = await this.services.interact.state(data);
    await this.services.session.saveToDb(data.headers.projectID, data.params.userID, state);
    return state;
  }
}

export default StateManagement;
