import { BaseUtils } from "@voiceflow/base-types";
import { Slot } from "@voiceflow/base-types/build/cjs/models";
import { fetchChat } from "../../runtime/handlers/utils/ai"; // TODO: where should this live? it's a weird import
import { getEntityProcessingSystemPrompt, getEntityProcessingUserPrompt } from "./prompt-wrapper.const";
import { PromptWrapperContext, PromptWrapperExtractionResult, PromptWrapperModelParams, PromptWrapperSideEffects, PromptWrapperSlotMap } from "./prompt-wrapper.interface";

export class PromptWrapper {

  private modelParams?: PromptWrapperModelParams;
  private userTranscripts?: string[];
  private assistantTranscripts?: string[];
  private rules?: string[];
  private exitScenarios?: string[];
  private slotMap?: PromptWrapperSlotMap;
  private utterance?: string;
  private context?: PromptWrapperContext;

  constructor(private mlGateway: any) {
  }

  withModelParams(params: PromptWrapperModelParams) {
    this.modelParams = params;
    return this;
  }

  withTranscripts(messages: BaseUtils.ai.Message[]) {
    // TODO: optimize to not go through array twice?

    this.userTranscripts = messages
        .filter((message) => message.role === 'user')
        .slice(0, -1)
        .map((message) => message.content)

    this.assistantTranscripts = messages
      .filter((message) => message.role === 'assistant')
      .map((message) => message.content);

    return this;
  }

  withRules(rules: string[]) {
    this.rules = rules;
    return this;
  }

  withExitScenarios(scenarios: string[]) {
    this.exitScenarios = scenarios;
    return this;
  }

  withSlots(slots: Slot[]) {
    this.slotMap =  Object.fromEntries(
      slots.map(({ name, type: { value: type }, inputs }) => [
        name,
        {
          ...(type &&
            type?.toLowerCase() !== 'custom' && { type: type.replace('VF.', '').toLowerCase() }),
          ...(inputs.length > 0 && { examples: inputs }),
        },
      ])
    );
    return this;
  }

  withUtterance(utterance: string) {
    this.utterance = utterance;
    return this;
  }

  withContext(context: PromptWrapperContext) {
    this.context = context;
    return this;
  }

  async exec(): Promise<[PromptWrapperExtractionResult, PromptWrapperSideEffects]> {
    if (!this.modelParams) throw new Error('Model params are required');
    if (!this.utterance) throw new Error('Utterance is required');
    if (!this.rules) throw new Error('Rules are required');
    if (!this.slotMap) throw new Error('Slots are required');
    if (!this.context) throw new Error('Context is required');
    if (!this.exitScenarios) throw new Error('Exit Scenarios are required');
    if (!this.userTranscripts) throw new Error('Transcripts are required');
    if (!this.assistantTranscripts) throw new Error('Transcripts are required');

    const response = await fetchChat(
      {
        messages: [
          {
            role: BaseUtils.ai.Role.SYSTEM,
            content: getEntityProcessingSystemPrompt(
              this.utterance,
              this.userTranscripts,
              this.assistantTranscripts,
              this.rules,
              this.exitScenarios,
              this.slotMap
            ),
          },
          {
            role: BaseUtils.ai.Role.USER,
            content: getEntityProcessingUserPrompt(
              this.utterance,
              this.userTranscripts,
              this.assistantTranscripts,
              this.rules,
              this.exitScenarios,
              this.slotMap
            ),
          },
        ],
        model: this.modelParams.model as any,
        system: this.modelParams.system,
        temperature: this.modelParams.temperature,
        maxTokens: this.modelParams.maxTokens,
      },
      this.mlGateway,
      {
        context: this.context
      },
    );

    const sideEffects = {
      tokens: response.tokens,
      answerTokens: response.answerTokens,
      queryTokens: response.queryTokens,
      multiplier: response.multiplier,
    }

    const result = this.parseOutput(response.output);
    return [
      result,
      sideEffects
    ];
  }

  private parseOutput(output: string | null): PromptWrapperExtractionResult {
    const data: PromptWrapperExtractionResult = {
      type: '',
      entityState: null,
      rationale: '',
      response: '',
    };
    if (output === null) {
      return data;
    }

    const lines = output.split(/\n+/); // Assuming each section is separated by a double newline
    lines.forEach((line) => {
      if (line.startsWith('Type:')) {
        data.type = line.substring('Type: '.length);
      } else if (line.startsWith('Entity State:')) {
        // Assuming Entity State is JSON-like but using single quotes
        const entityStateJson = line.substring('Entity State: '.length).replace(/'/g, '"').replace(/null/g, 'null');
        try {
          data.entityState = JSON.parse(entityStateJson);
        } catch (error) {
          data.entityState = null;
        }
      } else if (line.startsWith('Rationale:')) {
        data.rationale = line.substring('Rationale: '.length);
      } else if (line.startsWith('Response:')) {
        data.response = line.substring('Response: '.length);
      } else {
        data.response = line;
      }
    });

    return data;
  }
}
