import { describe, expect, it, vi } from 'vitest';

import { runGroundedChat } from './pipeline';
import type {
  ChatProvider,
  ChunkRecord,
  EmbeddingProvider,
  VectorStore,
} from './types';

describe('runGroundedChat', () => {
  const chunk: ChunkRecord = {
    chunkId: 'doc-1-p1-c0',
    documentId: 'doc-1',
    pageNumber: 1,
    text: 'Photosynthesis lets plants convert light into energy.',
    tokenEstimate: 12,
  };

  it('retrieves context, calls the chat provider, and returns citations', async () => {
    const embeddings: EmbeddingProvider = {
      id: 'test-embed',
      embedTexts: vi.fn(),
      embedQuery: vi.fn().mockResolvedValue([1, 0]),
    };
    const vectorStore: VectorStore = {
      upsert: vi.fn(),
      search: vi.fn().mockResolvedValue([{ chunk, score: 0.92 }]),
    };
    const chatProvider: ChatProvider = {
      id: 'test-chat',
      generateAnswer: vi.fn().mockResolvedValue({
        answer: 'Plants use light to make energy.',
        model: 'test-model',
      }),
    };

    const response = await runGroundedChat({
      documentId: 'doc-1',
      question: 'How do plants use light?',
      embeddings,
      vectorStore,
      chatProvider,
    });

    expect(embeddings.embedQuery).toHaveBeenCalledWith(
      'How do plants use light?',
    );
    expect(vectorStore.search).toHaveBeenCalledWith([1, 0], {
      documentId: 'doc-1',
      topK: 5,
    });
    expect(chatProvider.generateAnswer).toHaveBeenCalledWith({
      question: expect.stringContaining('Context:'),
      contextChunks: [chunk],
    });
    expect(response).toEqual({
      answer: 'Plants use light to make energy.',
      model: 'test-model',
      grounded: true,
      citations: [
        {
          documentId: 'doc-1',
          chunkId: 'doc-1-p1-c0',
          pageNumber: 1,
          score: 0.92,
          excerpt: chunk.text,
        },
      ],
    });
  });

  it('marks responses ungrounded when no retrieval results are found', async () => {
    const response = await runGroundedChat({
      documentId: 'doc-1',
      question: 'Missing?',
      topK: 2,
      embeddings: {
        id: 'test-embed',
        embedTexts: vi.fn(),
        embedQuery: vi.fn().mockResolvedValue([0]),
      },
      vectorStore: {
        upsert: vi.fn(),
        search: vi.fn().mockResolvedValue([]),
      },
      chatProvider: {
        id: 'test-chat',
        generateAnswer: vi.fn().mockResolvedValue({
          answer: 'No context found.',
          model: 'test-model',
        }),
      },
    });

    expect(response.grounded).toBe(false);
    expect(response.citations).toEqual([]);
  });
});
