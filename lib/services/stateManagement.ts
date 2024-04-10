import { BaseRequest, RuntimeLogs } from '@voiceflow/base-types';
import _ from 'lodash';

import { RuntimeRequest } from '@/lib/services/runtime/types';
import { State } from '@/runtime';

import { AbstractManager } from './utils';

class StateManagement extends AbstractManager {
  async interact(data: {
    params: { userID: string };
    body: {
      state?: State;
      action?: RuntimeRequest;
      request?: RuntimeRequest;
      config?: BaseRequest.RequestConfig;
    };
    query: { locale?: string; verbose?: boolean; logs?: RuntimeLogs.LogLevel };
    headers: { authorization?: string; projectID: string; versionID: string };
  }) {
    let state = await this.services.session.getFromDb<State>(
      data.headers.projectID,
      data.params.userID
    );
    if (_.isEmpty(state)) {
      state = await this.reset(data);
    }

    data.body.state = _.merge(state, {
      variables: data.body.state?.variables,
    });

    const { state: updatedState, trace, request } = await this.services.interact.handler(data);

    await this.services.session.saveToDb(data.headers.projectID, data.params.userID, updatedState);

    return data.query.verbose ? { state: updatedState, trace, request } : trace;
  }

  async reset(data: {
    headers: { projectID: string; versionID: string };
    params: { userID: string };
  }) {
    const {
      headers: { projectID, versionID },
      params: { userID },
    } = data;
    const state = await this.services.interact.state(versionID);
    await this.services.session.saveToDb(projectID, userID, state);
    return state;
  }
}

export default StateManagement;
