import { CreateModerationResponseResultsInner } from '@voiceflow/openai';

interface ContentModerationErrorDataItem {
  input: string;
  error: CreateModerationResponseResultsInner;
}
export class ContentModerationError extends Error {
  constructor(public readonly data: ContentModerationErrorDataItem[]) {
    super(
      '[moderation error] Sorry, we can’t fulfill your request due to language or content in your message that violates our Terms of Service.'
    );
  }
}
