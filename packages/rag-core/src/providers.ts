import type {
  ChatProvider,
  ChunkRecord,
  EmbeddingProvider,
  RetrievalResult,
  SearchOptions,
  VectorStore,
} from './types';

export interface OllamaProviderOptions {
  baseUrl: string;
  chatModel: string;
  embeddingModel: string;
  timeoutMs?: number;
}

interface OllamaChatResponse {
  model?: string;
  message?: {
    content?: string;
  };
  response?: string;
}

interface OllamaEmbedResponse {
  embedding?: number[];
  embeddings?: number[][];
}

interface OllamaTagsResponse {
  models?: Array<{
    name?: string;
    model?: string;
  }>;
}

export interface OllamaRuntimeStatus {
  provider: 'ollama';
  baseUrl: string;
  status: 'ready' | 'missing-models' | 'unreachable';
  chatModel: string;
  embeddingModel: string;
  availableModels: string[];
  missingModels: string[];
  error?: string;
}

export class MockEmbeddingProvider implements EmbeddingProvider {
  public id = 'mock-embeddings';

  public async embedTexts(texts: string[]): Promise<number[][]> {
    return texts.map((text) => this.vectorize(text));
  }

  public async embedQuery(text: string): Promise<number[]> {
    return this.vectorize(text);
  }

  private vectorize(text: string): number[] {
    const values = Array.from({ length: 8 }, () => 0);

    for (let index = 0; index < text.length; index += 1) {
      values[index % values.length] += text.charCodeAt(index) / 255;
    }

    return values;
  }
}

export class InMemoryVectorStore implements VectorStore {
  private records: Array<{ chunk: ChunkRecord; vector: number[] }> = [];

  public async upsert(
    chunks: ChunkRecord[],
    vectors: number[][],
  ): Promise<void> {
    chunks.forEach((chunk, index) => {
      this.records.push({ chunk, vector: vectors[index] });
    });
  }

  public async search(
    queryVector: number[],
    options: SearchOptions,
  ): Promise<RetrievalResult[]> {
    return this.records
      .filter((record) => record.chunk.documentId === options.documentId)
      .map((record) => ({
        chunk: record.chunk,
        score: cosineSimilarity(queryVector, record.vector),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, options.topK);
  }
}

export class MockChatProvider implements ChatProvider {
  public id = 'mock-chat';

  public async generateAnswer(input: {
    question: string;
    contextChunks: ChunkRecord[];
  }): Promise<{ answer: string; model: string }> {
    const primaryChunk = input.contextChunks[0];

    if (!primaryChunk) {
      return {
        answer:
          'I could not find enough supporting context in the indexed document.',
        model: 'mock-chat',
      };
    }

    return {
      answer: `Grounded answer based on page ${primaryChunk.pageNumber}: ${primaryChunk.text.slice(
        0,
        180,
      )}`,
      model: 'mock-chat',
    };
  }
}

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  public id = 'ollama-embeddings';

  public constructor(private readonly options: OllamaProviderOptions) {}

  public async embedTexts(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    try {
      const payload = await postOllamaJson<OllamaEmbedResponse>(
        this.options,
        '/api/embed',
        {
          model: this.options.embeddingModel,
          input: texts,
        },
      );

      if (Array.isArray(payload.embeddings)) {
        return payload.embeddings;
      }
    } catch {
      // Older Ollama versions expose only /api/embeddings, so fall through.
    }

    return Promise.all(texts.map((text) => this.embedWithLegacyEndpoint(text)));
  }

  public async embedQuery(text: string): Promise<number[]> {
    const [embedding] = await this.embedTexts([text]);
    return embedding;
  }

  private async embedWithLegacyEndpoint(text: string): Promise<number[]> {
    const payload = await postOllamaJson<OllamaEmbedResponse>(
      this.options,
      '/api/embeddings',
      {
        model: this.options.embeddingModel,
        prompt: text,
      },
    );

    if (!Array.isArray(payload.embedding)) {
      throw new Error(
        'Ollama embedding response did not include an embedding.',
      );
    }

    return payload.embedding;
  }
}

export class OllamaChatProvider implements ChatProvider {
  public id = 'ollama-chat';

  public constructor(private readonly options: OllamaProviderOptions) {}

  public async generateAnswer(input: {
    question: string;
    contextChunks: ChunkRecord[];
  }): Promise<{ answer: string; model: string }> {
    const payload = await postOllamaJson<OllamaChatResponse>(
      this.options,
      '/api/chat',
      {
        model: this.options.chatModel,
        stream: false,
        messages: [
          {
            role: 'user',
            content: input.question,
          },
        ],
        options: {
          temperature: 0.2,
        },
      },
    );

    const answer = payload.message?.content ?? payload.response;
    if (!answer) {
      throw new Error('Ollama chat response did not include text content.');
    }

    return {
      answer,
      model: payload.model ?? this.options.chatModel,
    };
  }
}

export const getOllamaRuntimeStatus = async (
  options: OllamaProviderOptions,
): Promise<OllamaRuntimeStatus> => {
  try {
    const payload = await fetchOllamaJson<OllamaTagsResponse>(
      options,
      '/api/tags',
    );
    const availableModels = (payload.models ?? [])
      .map((model) => model.name ?? model.model)
      .filter((model): model is string => Boolean(model));
    const requiredModels = [options.chatModel, options.embeddingModel];
    const missingModels = requiredModels.filter(
      (model) => !availableModels.includes(model),
    );

    return {
      provider: 'ollama',
      baseUrl: normalizeOllamaBaseUrl(options.baseUrl),
      status: missingModels.length === 0 ? 'ready' : 'missing-models',
      chatModel: options.chatModel,
      embeddingModel: options.embeddingModel,
      availableModels,
      missingModels,
    };
  } catch (error) {
    return {
      provider: 'ollama',
      baseUrl: normalizeOllamaBaseUrl(options.baseUrl),
      status: 'unreachable',
      chatModel: options.chatModel,
      embeddingModel: options.embeddingModel,
      availableModels: [],
      missingModels: [options.chatModel, options.embeddingModel],
      error: error instanceof Error ? error.message : 'Unknown Ollama error',
    };
  }
};

const cosineSimilarity = (left: number[], right: number[]) => {
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }

  if (!leftMagnitude || !rightMagnitude) {
    return 0;
  }

  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
};

const normalizeOllamaBaseUrl = (baseUrl: string) => baseUrl.replace(/\/$/, '');

const fetchOllamaJson = async <T>(
  options: OllamaProviderOptions,
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 120_000,
  );

  try {
    const response = await fetch(
      `${normalizeOllamaBaseUrl(options.baseUrl)}${path}`,
      {
        ...init,
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Ollama ${path} returned ${response.status}: ${body}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
};

const postOllamaJson = async <T>(
  options: OllamaProviderOptions,
  path: string,
  body: unknown,
): Promise<T> =>
  fetchOllamaJson<T>(options, path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
