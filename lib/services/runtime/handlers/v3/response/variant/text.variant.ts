import { BaseTrace } from '@voiceflow/base-types';

import { ResolvedTextVariant } from '../response.types';
import { VariableContext } from '../variableContext/variableContext';
import { BaseVariant } from './base.variant';

export class TextVariant extends BaseVariant<ResolvedTextVariant> {
  constructor(rawVariant: ResolvedTextVariant, varContext: VariableContext) {
    super(rawVariant, varContext);
  }

  get type() {
    return this.rawVariant.type;
  }

  trace(): BaseTrace.V3.TextTrace {
    return {
      type: BaseTrace.TraceType.TEXT,
      payload: {
        content: this.varContext.resolveMarkup(this.rawVariant.text),
      },
    };
  }
}
