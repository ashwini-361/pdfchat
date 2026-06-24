import type { BrowserLanguageModelOption } from './models';
import { browserLanguageModels } from './models';

export type BrowserChatRole = 'system' | 'user' | 'assistant';

export interface BrowserChatMessage {
  role: BrowserChatRole;
  content: string;
}

export interface BrowserGenerationProgress {
  text: string;
  modelId: string;
}

export interface BrowserEngineProgress {
  progress?: number;
  text?: string;
}

export interface WebLlmModelOption {
  id: string;
  label: string;
  family: BrowserLanguageModelOption['family'];
  sizeLabel: string;
}

export const defaultWebLlmModels: WebLlmModelOption[] =
  browserLanguageModels.map((model) => ({
    id: model.id,
    label: model.label,
    family: model.family,
    sizeLabel: model.sizeLabel,
  }));

export class BrowserWebLlmEngine {
  private engine: unknown = null;

  public constructor(private readonly model: BrowserLanguageModelOption) {}

  public async initialize(
    onProgress: (progress: BrowserEngineProgress) => void = () => {},
  ) {
    if (this.engine) {
      return;
    }

    const { CreateMLCEngine } = await import('@mlc-ai/web-llm');
    this.engine = await CreateMLCEngine(this.model.id, {
      initProgressCallback: (progress: BrowserEngineProgress) => {
        onProgress(progress);
      },
      appConfig: {
        model_list: [
          {
            model: this.model.modelUrl,
            model_id: this.model.id,
            model_lib: this.model.modelLibUrl,
          },
        ],
      },
    });
  }

  public async generate(
    messages: BrowserChatMessage[],
    onProgress: (progress: BrowserGenerationProgress) => void = () => {},
  ) {
    if (!this.engine) {
      await this.initialize();
    }

    const engine = this.engine as {
      chat: {
        completions: {
          create: (input: {
            messages: BrowserChatMessage[];
            temperature: number;
            stream: true;
            stream_options: { include_usage: true };
          }) => AsyncIterable<{
            choices?: Array<{
              delta?: {
                content?: string;
              };
            }>;
          }>;
        };
      };
    };
    const chunks = await engine.chat.completions.create({
      messages,
      temperature: 0.2,
      stream: true,
      stream_options: { include_usage: true },
    });
    let text = '';

    for await (const chunk of chunks) {
      text += chunk.choices?.[0]?.delta?.content ?? '';
      onProgress({ text, modelId: this.model.id });
    }

    return text;
  }
}

export const describeWebLlmStrategy = () =>
  'Use WebLLM as the primary browser-native inference path for offline PDF chat; backend Ollama remains optional.';
