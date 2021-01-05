declare module '@voiceflow/common' {
  namespace utils.general {
    // eslint-disable-next-line import/prefer-default-export
    export function generateHash(arr: string[]): string;
    export function getProcessEnv(variable: string): string;
    export function hasProcessEnv(variable: string): boolean;
  }

  namespace utils.intent {
    export function formatName(name: string): string;
    export function getSlotsForKeys(keys: unknown[], slots: unknown[], platform: string): { name: string; type: string }[];
    export function getUtterancesWithSlotNames(inputs: unknown[], slots: unknown[], ...args: any[]): string[];
  }
}
