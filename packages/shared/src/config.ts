export interface PublicRuntimeConfig {
  apiBaseUrl: string;
  browserRagEnabled: boolean;
  webLlmEnabled: boolean;
  pdfPreviewEnabled: boolean;
}

const normalizeBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback;
  }

  return value === 'true';
};

export const getPublicRuntimeConfig = (
  env: Record<string, string | undefined>,
): PublicRuntimeConfig => ({
  apiBaseUrl: env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000',
  browserRagEnabled: normalizeBoolean(
    env.NEXT_PUBLIC_BROWSER_RAG_ENABLED,
    true,
  ),
  webLlmEnabled: normalizeBoolean(env.NEXT_PUBLIC_WEB_LLM_ENABLED, true),
  pdfPreviewEnabled: normalizeBoolean(
    env.NEXT_PUBLIC_PDF_PREVIEW_ENABLED,
    true,
  ),
});

export interface ServiceRuntimeConfig {
  appEnv: string;
  databaseUrl: string;
  ollamaBaseUrl: string;
  ollamaChatModel: string;
  ollamaEmbeddingModel: string;
  objectStorageEndpoint: string;
  objectStorageBucket: string;
}

export const getServiceRuntimeConfig = (
  env: NodeJS.ProcessEnv,
): ServiceRuntimeConfig => ({
  appEnv: env.APP_ENV ?? 'development',
  databaseUrl:
    env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/doc_chat',
  ollamaBaseUrl: env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
  ollamaChatModel: env.OLLAMA_CHAT_MODEL ?? 'gemma3:4b',
  ollamaEmbeddingModel: env.OLLAMA_EMBEDDING_MODEL ?? 'nomic-embed-text',
  objectStorageEndpoint: env.OBJECT_STORAGE_ENDPOINT ?? 'http://localhost:9000',
  objectStorageBucket: env.OBJECT_STORAGE_BUCKET ?? 'documents',
});

