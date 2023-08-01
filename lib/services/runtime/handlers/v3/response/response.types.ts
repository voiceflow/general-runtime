import { BaseRequest, BaseUtils } from '@voiceflow/base-types';
import { z } from 'nestjs-zod/z';

// $TODO$ - Replace all of this with actual response type from Pedro's work

export const VariableReference = z.object({ name: z.string().uuid(), variableID: z.string() }).strict();
export type VariableReference = z.infer<typeof VariableReference>;

export const EntityReference = z.object({ name: z.string().uuid(), entityID: z.string() }).strict();
export type EntityReference = z.infer<typeof EntityReference>;

export const MarkupSpan = z
  .object({
    attributes: z.record(z.union([z.null(), z.boolean(), z.number(), z.string()])),
  })
  .strict();
export type MarkupSpan = z.infer<typeof MarkupSpan> & { text: Markup };

export type MarkupNode = string | VariableReference | EntityReference | MarkupSpan;

export type Markup = Array<MarkupNode>;
export const Markup: z.ZodType<Markup> = z
  .union([z.string(), VariableReference, EntityReference, MarkupSpan.extend({ text: z.lazy(() => Markup) })])
  .array();

export enum Language {
  ENGLISH_US = 'en-us',
}

export enum Channel {
  DEFAULT = 'default',
}

export enum ResponseVariantType {
  JSON = 'json',
  PROMPT = 'prompt',

  /**
   * only available if the default interface is text
   */
  TEXT = 'text',
}

export enum CardLayout {
  CAROUSEL = 'carousel',
  LIST = 'list',
}

export enum ConditionType {
  EXPRESSION = 'expression',
  PROMPT = 'prompt',
  SCRIPT = 'script',
}

export enum ConditionOperation {
  IS = 'is',
  IS_NOT = 'is_not',

  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty',

  GREATER_THAN = 'greater_than',
  GREATER_OR_EQUAL = 'greater_or_equal',
  LESS_THAN = 'less_than',
  LESS_OR_EQUAL = 'less_or_equal',

  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
}

export interface ConditionAssertion {
  operation: ConditionOperation;
  lhs: unknown;
  rhs: unknown;
}

export interface ConditionPredicate {
  operation: ConditionOperation;
  rhs: unknown;
}

export interface BaseCondition {
  type: ConditionType;
}

export interface ExpressionCondition extends BaseCondition {
  type: ConditionType.EXPRESSION;
  matchAll: boolean;
  assertions: Record<string, ConditionAssertion>;
}

export interface PromptCondition {
  type: ConditionType.PROMPT;
  turns: number;
  prompt: {
    name: string;
    text: unknown;
    persona: {
      name: string | null;
      model: string | null;
      temperature: number | null;
      maxLength: number | null;
      systemPrompt: string | null;
    } | null;
  };
  predictes: Record<string, ConditionPredicate>;
}

export interface ScriptCondition {
  type: ConditionType.SCRIPT;
  code: unknown;
}

export type ResolvedCondition = ExpressionCondition | PromptCondition | ScriptCondition;

export enum AttachmentType {
  CARD = 'card',
  MEDIA = 'media',
}

export interface BaseAttachment {
  type: AttachmentType;
}

export enum MediaDatatype {
  IMAGE = 'image',
  VIDEO = 'video',
}

export interface MediaResource {
  name: string;
  datatype: MediaDatatype;
  isAsset: boolean;
  url: Markup;
}

export interface CardAttachment {
  type: AttachmentType.CARD;
  card: {
    id: string;
    title: string;
    description: string;
    buttonOrder: string[];
    buttons: Record<string, BaseRequest.GeneralRequestButton>;
    media: MediaResource;
  };
}
export interface MediaAttachment {
  type: AttachmentType.MEDIA;
  media: MediaResource;
}

export type ResolvedAttachment = CardAttachment | MediaAttachment;

export interface BaseResolvedVariant {
  type: ResponseVariantType;
  speed: number;
  cardLayout: CardLayout;
  condition: ResolvedCondition | null;
  attachmentOrder: string[];
  attachments: Record<string, ResolvedAttachment>;
}

export interface ResolvedTextVariant extends BaseResolvedVariant {
  type: ResponseVariantType.TEXT;
  text: Markup;
}

export interface ResolvedJSONVariant extends BaseResolvedVariant {
  type: ResponseVariantType.JSON;
  json: Markup;
}

export enum ResponseContext {
  PROMPT = 'prompt',
  MEMORY = 'memory',
  KNOWLEDGE_BASE = 'knowledge_base',
}

export interface ResolvedPromptVariant extends BaseResolvedVariant {
  type: ResponseVariantType.PROMPT;
  turns: number;
  context: ResponseContext;
  prompt: {
    text: Markup;
    persona: {
      model: BaseUtils.ai.GPT_MODEL;
      temperature: number | null;
      maxLength: number | null;
      systemPrompt: string | null;
    };
  };
}

export type ResolvedVariant = ResolvedPromptVariant | ResolvedJSONVariant | ResolvedTextVariant;

export interface ResolvedDiscriminator {
  language: Language;
  channel: Channel;
  variantOrder: string[];
  variants: Record<string, ResolvedVariant>;
}

export interface ResponseNode {
  id: string;
  type: 'response';
  data: {
    responses: Record<string, ResolvedDiscriminator>;
  };
  nextId: string;
}
