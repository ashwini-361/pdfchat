import { describe, expect, it } from 'vitest';

import { getPublicRuntimeConfig, getServiceRuntimeConfig } from './config';

describe('getPublicRuntimeConfig', () => {
  it('uses browser runtime defaults', () => {
    expect(getPublicRuntimeConfig({})).toEqual({
      apiBaseUrl: 'http://localhost:4000',
      browserRagEnabled: true,
      webLlmEnabled: true,
      pdfPreviewEnabled: true,
    });
  });

  it('applies public runtime overrides', () => {
    expect(
      getPublicRuntimeConfig({
        NEXT_PUBLIC_API_BASE_URL: 'http://api.test',
        NEXT_PUBLIC_BROWSER_RAG_ENABLED: 'false',
        NEXT_PUBLIC_WEB_LLM_ENABLED: 'false',
        NEXT_PUBLIC_PDF_PREVIEW_ENABLED: 'false',
      }),
    ).toEqual({
      apiBaseUrl: 'http://api.test',
      browserRagEnabled: false,
      webLlmEnabled: false,
      pdfPreviewEnabled: false,
    });
  });
});

describe('getServiceRuntimeConfig', () => {
  it('uses Ollama service defaults', () => {
    expect(getServiceRuntimeConfig({} as NodeJS.ProcessEnv)).toMatchObject({
      appEnv: 'development',
      chatProvider: 'ollama',
      embeddingProvider: 'ollama',
      ollamaBaseUrl: 'http://localhost:11434',
      ollamaChatModel: 'gemma3:4b',
      ollamaEmbeddingModel: 'nomic-embed-text',
      modelRequestTimeoutMs: 120_000,
    });
  });

  it('supports explicit chat and embedding provider overrides', () => {
    const config = getServiceRuntimeConfig({
      CHAT_PROVIDER: 'mock',
      EMBEDDING_PROVIDER: 'mock',
      OLLAMA_BASE_URL: 'http://ollama:11434',
      OLLAMA_CHAT_MODEL: 'llama3.2',
      OLLAMA_EMBEDDING_MODEL: 'all-minilm',
      MODEL_REQUEST_TIMEOUT_MS: '45000',
    } as NodeJS.ProcessEnv);

    expect(config).toMatchObject({
      chatProvider: 'mock',
      embeddingProvider: 'mock',
      ollamaBaseUrl: 'http://ollama:11434',
      ollamaChatModel: 'llama3.2',
      ollamaEmbeddingModel: 'all-minilm',
      modelRequestTimeoutMs: 45_000,
    });
  });

  it('uses MODEL_PROVIDER as a provider fallback', () => {
    const config = getServiceRuntimeConfig({
      MODEL_PROVIDER: 'mock',
    } as NodeJS.ProcessEnv);

    expect(config.chatProvider).toBe('mock');
    expect(config.embeddingProvider).toBe('mock');
  });

  it('falls back to safe values for invalid providers and timeouts', () => {
    const config = getServiceRuntimeConfig({
      CHAT_PROVIDER: 'not-real',
      EMBEDDING_PROVIDER: 'also-not-real',
      MODEL_REQUEST_TIMEOUT_MS: '-1',
    } as NodeJS.ProcessEnv);

    expect(config.chatProvider).toBe('ollama');
    expect(config.embeddingProvider).toBe('ollama');
    expect(config.modelRequestTimeoutMs).toBe(120_000);
  });
});
