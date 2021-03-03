export const SSML_TAG_REGEX = /<\/?[^>]+(>|$)/g;

export const sanitizeSSML = (ssml: string) => ssml.replace(SSML_TAG_REGEX, '');
