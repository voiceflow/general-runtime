import { Language } from '../response.types';

export interface TranslationContext {
  toLang: Language;
  fromLang: Language;
}
