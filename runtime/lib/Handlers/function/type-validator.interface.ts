export interface TypeValidatorSuccessResult {
  success: true;
}

export interface TypeValidatorErrorResult {
  success: false;
  variable: string;
  expectedType: string;
}

export type TypeValidatorResult = TypeValidatorSuccessResult | TypeValidatorErrorResult;
