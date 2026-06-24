import type { FastifyInstance } from 'fastify';

import { getServiceRuntimeConfig } from '@doc-chat/shared';
import { getOllamaRuntimeStatus } from '@doc-chat/rag-core';

export const registerHealthRoutes = async (app: FastifyInstance) => {
  app.get('/health', async () => {
    const config = getServiceRuntimeConfig(process.env);
    const usesOllama =
      config.chatProvider === 'ollama' || config.embeddingProvider === 'ollama';
    const ollama = usesOllama
      ? await getOllamaRuntimeStatus({
          baseUrl: config.ollamaBaseUrl,
          chatModel: config.ollamaChatModel,
          embeddingModel: config.ollamaEmbeddingModel,
          timeoutMs: Math.min(config.modelRequestTimeoutMs, 3_000),
        })
      : null;
    const runtimeReady = !ollama || ollama.status === 'ready';

    return {
      status: runtimeReady ? 'ok' : 'degraded',
      service: 'api',
      appEnv: config.appEnv,
      model: config.ollamaChatModel,
      runtime: {
        scope: 'backend-only',
        api: 'fastify-node',
        modelExecution:
          config.chatProvider === 'ollama'
            ? 'backend-api-to-ollama'
            : 'backend-api-mock',
        chatProvider: config.chatProvider,
        embeddingProvider: config.embeddingProvider,
        ollama,
        browserRuntime: {
          primaryMode: 'browser-webgpu-webllm',
          measuredByHealth: false,
          note: 'Browser WebGPU/WebLLM support is detected inside the web app settings panel.',
        },
      },
    };
  });
};
