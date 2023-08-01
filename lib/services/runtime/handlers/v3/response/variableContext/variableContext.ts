import { BaseMarkup as ResolvedMarkup } from '@voiceflow/base-types';
import { replaceVariables } from '@voiceflow/common/build/cjs/utils';

import { EntityReference, Markup, MarkupNode, MarkupSpan, VariableReference } from '../response.types';

export class VariableContext {
  constructor(private readonly variables: Record<string, unknown>) {}

  private isVariableReference(markupNode: MarkupNode): markupNode is VariableReference {
    return VariableReference.safeParse(markupNode).success;
  }

  private isEntityReference(markupNode: MarkupNode): markupNode is EntityReference {
    return EntityReference.safeParse(markupNode).success;
  }

  private isMarkupSpan(markupNode: MarkupNode): markupNode is MarkupSpan {
    return MarkupSpan.safeParse(markupNode).success;
  }

  private resolveMarkupNode(markupNode: MarkupNode): ResolvedMarkup.MarkupNode {
    if (typeof markupNode === 'string') {
      return markupNode;
    }

    if (this.isVariableReference(markupNode) || this.isEntityReference(markupNode)) {
      const variableValue = this.variables[markupNode.name];
      return JSON.stringify(variableValue);
    }

    if (this.isMarkupSpan(markupNode)) {
      return {
        attributes: markupNode.attributes,
        text: this.resolveMarkupCollection(markupNode.text),
      };
    }

    throw new Error('received unexpected markup content');
  }

  private resolveMarkupCollection(markup: Markup): ResolvedMarkup.Markup {
    return markup.map((node) => this.resolveMarkupNode(node));
  }

  public resolveMarkup(markup: Markup) {
    return this.resolveMarkupCollection(markup);
  }

  public resolve(content: string) {
    return replaceVariables(content, this.variables);
  }

  public getVariableMap(): Record<string, unknown> {
    return this.variables;
  }
}
