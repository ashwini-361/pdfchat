import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getOllamaRuntimeStatus,
  InMemoryVectorStore,
  MockChatProvider,
  MockEmbeddingProvider,
  OllamaChatProvider,
  OllamaEmbeddingProvider,
} from './providers';
import type { ChunkRecord } from './types';

const ollamaOptions = {
  baseUrl: 'http://ollama.test/',
  chatModel: 'gemma3:4b',
  embeddingModel: 'nomic-embed-text',
  timeoutMs: 100,
};

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

describe('mock providers and in-memory vector store', () => {
  it('creates deterministic mock embeddings', async () => {
    const provider = new MockEmbeddingProvider();

    await expect(provider.embedQuery('abc')).resolves.toHaveLength(8);
    await expect(provider.embedTexts(['abc', 'def'])).resolves.toHaveLength(2);
  });

  it('stores and searches vectors for the requested document', async () => {
    const store = new InMemoryVectorStore();
    const chunks: ChunkRecord[] = [
      {
        chunkId: 'doc-1-a',
        documentId: 'doc-1',
        pageNumber: 1,
        text: 'alpha',
        tokenEstimate: 2,
      },
      {
        chunkId: 'doc-2-a',
        documentId: 'doc-2',
        pageNumber: 1,
        text: 'beta',
        tokenEstimate: 2,
      },
    ];

    await store.upsert(chunks, [
      [1, 0],
      [0, 1],
    ]);

    const results = await store.search([1, 0], {
      documentId: 'doc-1',
      topK: 5,
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.chunk.chunkId).toBe('doc-1-a');
    expect(results[0]?.score).toBe(1);
  });

  it('returns grounded mock chat responses and empty-context responses', async () => {
    const provider = new MockChatProvider();
    const chunk: ChunkRecord = {
      chunkId: 'chunk-1',
      documentId: 'doc-1',
      pageNumber: 3,
      text: 'A useful passage for testing.',
      tokenEstimate: 10,
    };

    await expect(
      provider.generateAnswer({ question: 'What?', contextChunks: [chunk] }),
    ).resolves.toMatchObject({
      model: 'mock-chat',
      answer: expect.stringContaining('page 3'),
    });
    await expect(
      provider.generateAnswer({ question: 'What?', contextChunks: [] }),
    ).resolves.toMatchObject({
      model: 'mock-chat',
      answer: expect.stringContaining('could not find enough'),
    });
  });
});

describe('Ollama providers', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('generates chat answers through /api/chat', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        jsonResponse({ model: 'gemma3:4b', message: { content: 'Answer' } }),
      );

    const provider = new OllamaChatProvider(ollamaOptions);
    const response = await provider.generateAnswer({
      question: 'Prompt',
      contextChunks: [],
    });

    expect(response).toEqual({ answer: 'Answer', model: 'gemma3:4b' });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://ollama.test/api/chat',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          model: 'gemma3:4b',
          stream: false,
          messages: [{ role: 'user', content: 'Prompt' }],
          options: { temperature: 0.2 },
        }),
      }),
    );
  });

  it('embeds batches through /api/embed', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ embeddings: [[1, 2, 3]] }),
    );

    const provider = new OllamaEmbeddingProvider(ollamaOptions);

    await expect(provider.embedTexts(['hello'])).resolves.toEqual([[1, 2, 3]]);
  });

  it('falls back to legacy /api/embeddings when /api/embed is unavailable', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse({ message: 'missing' }, { status: 404 }),
      )
      .mockResolvedValueOnce(jsonResponse({ embedding: [4, 5, 6] }));

    const provider = new OllamaEmbeddingProvider(ollamaOptions);

    await expect(provider.embedTexts(['hello'])).resolves.toEqual([[4, 5, 6]]);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://ollama.test/api/embeddings',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('reports ready and missing-model runtime statuses', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse({
          models: [{ name: 'gemma3:4b' }, { name: 'nomic-embed-text' }],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ models: [{ name: 'gemma3:4b' }] }));

    await expect(getOllamaRuntimeStatus(ollamaOptions)).resolves.toMatchObject({
      status: 'ready',
      missingModels: [],
    });
    await expect(getOllamaRuntimeStatus(ollamaOptions)).resolves.toMatchObject({
      status: 'missing-models',
      missingModels: ['nomic-embed-text'],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://ollama.test/api/tags',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('reports unreachable status for failed and timed-out runtime probes', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
      new Error('fetch failed'),
    );

    await expect(getOllamaRuntimeStatus(ollamaOptions)).resolves.toMatchObject({
      status: 'unreachable',
      error: 'fetch failed',
    });

    vi.useFakeTimers();
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          const signal = init?.signal as AbortSignal | undefined;
          signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const statusPromise = getOllamaRuntimeStatus({
      ...ollamaOptions,
      timeoutMs: 5,
    });
    await vi.advanceTimersByTimeAsync(5);

    await expect(statusPromise).resolves.toMatchObject({
      status: 'unreachable',
      error: 'aborted',
    });
  });
});
