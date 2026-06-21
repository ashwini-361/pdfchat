import type { SourceCitation } from '@doc-chat/shared';

import { buildGroundedUserPrompt, groundedSystemPrompt } from './prompts';
import type {
  ChatProvider,
  ChunkRecord,
  EmbeddingProvider,
  GroundedAnswer,
  RetrievalResult,
  SearchOptions,
  VectorStore,
} from './types';

export const createCitations = (
  results: RetrievalResult[],
): SourceCitation[] =>
  results.map((result) => ({
    documentId: result.chunk.documentId,
    chunkId: result.chunk.chunkId,
    pageNumber: result.chunk.pageNumber,
    score: result.score,
    excerpt: result.chunk.text.slice(0, 220),
  }));

export const runGroundedChat = async (input: {
  documentId: string;
  question: string;
  topK?: number;
  embeddings: EmbeddingProvider;
  vectorStore: VectorStore;
  chatProvider: ChatProvider;
}): Promise<GroundedAnswer> => {
  const topK = input.topK ?? 5;
  const queryVector = await input.embeddings.embedQuery(input.question);
  const searchOptions: SearchOptions = {
    documentId: input.documentId,
    topK,
  };

  const results = await input.vectorStore.search(queryVector, searchOptions);
  const chunks: ChunkRecord[] = results.map((result) => result.chunk);
  const prompt = buildGroundedUserPrompt(input.question, chunks);
  const response = await input.chatProvider.generateAnswer({
    question: `${groundedSystemPrompt}\n\n${prompt}`,
    contextChunks: chunks,
  });

  return {
    answer: response.answer,
    citations: createCitations(results),
    model: response.model,
    grounded: results.length > 0,
  };
};

