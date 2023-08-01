import { Variant } from '../variant/variant.interface';

export class VariantCollection {
  public readonly conditionedVars: Variant[];

  public readonly unconditionedVars: Variant[];

  constructor(variants: Variant[]) {
    this.conditionedVars = [];
    this.unconditionedVars = [];

    variants.forEach((vari) => {
      if (vari.condition) {
        this.conditionedVars.push(vari);
      } else {
        this.unconditionedVars.push(vari);
      }
    });
  }
}
