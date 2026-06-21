import type {
  ChatProvider,
  ChunkRecord,
  EmbeddingProvider,
  RetrievalResult,
  SearchOptions,
  VectorStore,
} from './types';

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

  public async upsert(chunks: ChunkRecord[], vectors: number[][]): Promise<void> {
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

