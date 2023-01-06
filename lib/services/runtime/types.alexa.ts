export enum IntentName {
  CANCEL = 'AMAZON.CancelIntent',
  STOP = 'AMAZON.StopIntent',
}
export interface SlotValue {
  value: string;
  resolutions?: { resolutionsPerAuthority?: [{ authority?: string; values?: [{ value?: { name?: string } }] }] };
}
