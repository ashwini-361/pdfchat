import { describe, expect, it } from 'vitest';

import { getOllamaRuntimeStatus, OllamaEmbeddingProvider } from './providers';

const liveEnabled = process.env.RUN_OLLAMA_TESTS === 'true';

describe.skipIf(!liveEnabled)('live Ollama providers', () => {
  const requiredEnv = () => {
    const baseUrl = process.env.OLLAMA_BASE_URL;
    const chatModel = process.env.OLLAMA_CHAT_MODEL;
    const embeddingModel = process.env.OLLAMA_EMBEDDING_MODEL;

    if (!baseUrl || !chatModel || !embeddingModel) {
      throw new Error(
        'RUN_OLLAMA_TESTS=true requires OLLAMA_BASE_URL, OLLAMA_CHAT_MODEL, and OLLAMA_EMBEDDING_MODEL.',
      );
    }

    return {
      baseUrl,
      chatModel,
      embeddingModel,
      timeoutMs: Number(process.env.MODEL_REQUEST_TIMEOUT_MS ?? 120_000),
    };
  };

  it('checks runtime status and generates one embedding', async () => {
    const options = requiredEnv();
    const status = await getOllamaRuntimeStatus(options);

    expect(status.status).toBe('ready');

    const provider = new OllamaEmbeddingProvider(options);
    const [embedding] = await provider.embedTexts(['live ollama smoke test']);

    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding.length).toBeGreaterThan(0);
  });
});
