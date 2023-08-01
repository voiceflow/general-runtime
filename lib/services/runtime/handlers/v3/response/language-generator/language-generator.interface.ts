export interface LanguageGeneratorReturn {
  tokens: number;
  output: string | null;
}

export interface LanguageGenerator<T extends Record<string, any>> {
  generate(prompt: string, settings: T): Promise<LanguageGeneratorReturn> | LanguageGeneratorReturn;
}
