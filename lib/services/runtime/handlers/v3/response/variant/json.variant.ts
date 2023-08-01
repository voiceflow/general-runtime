import { BaseTrace } from '@voiceflow/base-types';

import { serializeResolvedMarkup } from '../markupUtils/markupUtils';
import { ResolvedJSONVariant } from '../response.types';
import { VariableContext } from '../variableContext/variableContext';
import { BaseVariant } from './base.variant';

export class JSONVariant extends BaseVariant<ResolvedJSONVariant> {
  constructor(rawVariant: ResolvedJSONVariant, varContext: VariableContext) {
    super(rawVariant, varContext);
  }

  get type() {
    return this.rawVariant.type;
  }

  trace(): BaseTrace.V3.JSONTrace {
    return {
      type: BaseTrace.TraceType.JSON,
      payload: {
        json: JSON.parse(serializeResolvedMarkup(this.varContext.resolveMarkup(this.rawVariant.json))),
      },
    };
  }
}
