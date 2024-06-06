import { createHash } from 'crypto';

export const getEntityPrefixHash = (contents: string) => createHash('sha256').update(contents).digest('hex').slice(-10);
