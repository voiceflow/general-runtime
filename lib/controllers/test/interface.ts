import { IntentClassificationSettingsDTO, VariableDatatype } from '@voiceflow/dtos';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

import { RuntimeCommandDTO } from '@/runtime/lib/Handlers/function/runtime-command/runtime-command.dto';

export const TestFunctionRequestBodyDTO = z
  .object({
    definition: z
      .object({
        code: z.string(),
        pathCodes: z.array(z.string()),
        inputVars: z.record(
          z
            .object({
              type: z.literal(VariableDatatype.TEXT),
            })
            .strict()
        ),
        outputVars: z.record(
          z
            .object({
              type: z.literal(VariableDatatype.TEXT),
            })
            .strict()
        ),
      })
      .strict(),
    invocation: z.object({
      inputVars: z.record(z.string()),
    }),
  })
  .strict();

export type TestFunctionRequestBody = z.infer<typeof TestFunctionRequestBodyDTO>;

export const TestFunctionResponseDTO = z
  .object({
    success: z.boolean(),
    latencyMS: z.number(),
    runtimeCommands: RuntimeCommandDTO,
  })
  .strict();

export type TestFunctionResponse = z.infer<typeof TestFunctionResponseDTO>;

export const TestClassificationRequestBodyDTO = z
  .object({
    projectID: z.string().refine((id) => ObjectId.isValid(id), {
      message: 'projectID must be a valid ObjectId',
    }),
    versionID: z.string().refine((id) => ObjectId.isValid(id), {
      message: 'versionID must be a valid ObjectId',
    }),
    utterance: z.string(),
    intentClassificationSettings: IntentClassificationSettingsDTO,
  })
  .strict();

export type TestClassificationRequestBodyDTO = z.infer<typeof TestClassificationRequestBodyDTO>;

export const ClassificationDTO = z.object({
  intents: z.array(
    z.object({
      name: z.string(),
      confidence: z.number(),
    })
  ),
});

export const TestClassificationResponseDTO = z
  .object({
    nlu: ClassificationDTO,
    llm: ClassificationDTO,
    utterance: z.string(),
  })
  .strict();

export type TestClassificationResponse = z.infer<typeof TestClassificationResponseDTO>;
