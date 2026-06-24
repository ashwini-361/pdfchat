import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };
const runtimeEnvKeys = [
  'CHAT_PROVIDER',
  'EMBEDDING_PROVIDER',
  'MODEL_PROVIDER',
  'OLLAMA_BASE_URL',
  'OLLAMA_CHAT_MODEL',
  'OLLAMA_EMBEDDING_MODEL',
  'MODEL_REQUEST_TIMEOUT_MS',
];

const createApp = async (env: NodeJS.ProcessEnv = {}) => {
  vi.resetModules();
  for (const key of runtimeEnvKeys) {
    delete process.env[key];
  }
  Object.assign(process.env, env);
  const { buildApp } = await import('./app');
  return buildApp();
};

describe('api app', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    for (const key of runtimeEnvKeys) {
      delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  });

  it('reports mock backend runtime health', async () => {
    const app = await createApp({
      CHAT_PROVIDER: 'mock',
      EMBEDDING_PROVIDER: 'mock',
    });

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ok',
      service: 'api',
      runtime: {
        scope: 'backend-only',
        modelExecution: 'backend-api-mock',
        chatProvider: 'mock',
        embeddingProvider: 'mock',
        ollama: null,
        browserRuntime: {
          primaryMode: 'browser-webgpu-webllm',
          measuredByHealth: false,
        },
      },
    });

    await app.close();
  });

  it('reports Ollama backend runtime health as ok or degraded', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            models: [{ name: 'gemma3:4b' }, { name: 'nomic-embed-text' }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ models: [{ name: 'gemma3:4b' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    const app = await createApp({
      CHAT_PROVIDER: 'ollama',
      EMBEDDING_PROVIDER: 'ollama',
      OLLAMA_BASE_URL: 'http://ollama.test',
      OLLAMA_CHAT_MODEL: 'gemma3:4b',
      OLLAMA_EMBEDDING_MODEL: 'nomic-embed-text',
    });

    const okResponse = await app.inject({ method: 'GET', url: '/health' });
    const degradedResponse = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(okResponse.statusCode).toBe(200);
    expect(okResponse.json()).toMatchObject({
      status: 'ok',
      runtime: {
        scope: 'backend-only',
        modelExecution: 'backend-api-to-ollama',
        chatProvider: 'ollama',
        embeddingProvider: 'ollama',
        browserRuntime: {
          primaryMode: 'browser-webgpu-webllm',
          measuredByHealth: false,
        },
        ollama: {
          status: 'ready',
          baseUrl: 'http://ollama.test',
        },
      },
    });
    expect(degradedResponse.json()).toMatchObject({
      status: 'degraded',
      runtime: {
        ollama: {
          status: 'missing-models',
          missingModels: ['nomic-embed-text'],
        },
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await app.close();
  });

  it('creates, lists, fetches, and indexes demo documents', async () => {
    const app = await createApp({
      CHAT_PROVIDER: 'mock',
      EMBEDDING_PROVIDER: 'mock',
    });

    const createResponse = await app.inject({
      method: 'POST',
      url: '/v1/documents',
      payload: {
        fileName: 'demo.txt',
        contentType: 'text/plain',
        sizeBytes: 12,
      },
    });
    const created = createResponse.json();

    expect(createResponse.statusCode).toBe(201);
    expect(created.document).toMatchObject({
      fileName: 'demo.txt',
      contentType: 'text/plain',
      status: 'uploaded',
      documentType: 'plain-text',
    });

    const listResponse = await app.inject({
      method: 'GET',
      url: '/v1/documents',
    });
    expect(listResponse.json()).toHaveLength(1);

    const getResponse = await app.inject({
      method: 'GET',
      url: `/v1/documents/${created.document.id}`,
    });
    expect(getResponse.json()).toMatchObject({ id: created.document.id });

    const missingResponse = await app.inject({
      method: 'GET',
      url: '/v1/documents/00000000-0000-0000-0000-000000000000',
    });
    expect(missingResponse.statusCode).toBe(404);

    const indexResponse = await app.inject({
      method: 'POST',
      url: `/v1/documents/${created.document.id}/index-demo`,
    });
    expect(indexResponse.statusCode).toBe(202);
    expect(indexResponse.json()).toMatchObject({
      documentId: created.document.id,
      provider: 'mock-embeddings',
    });

    await app.close();
  });

  it('answers grounded chat after demo indexing and returns 404 when ungrounded', async () => {
    const app = await createApp({
      CHAT_PROVIDER: 'mock',
      EMBEDDING_PROVIDER: 'mock',
    });
    const createResponse = await app.inject({
      method: 'POST',
      url: '/v1/documents',
      payload: {
        fileName: 'demo.txt',
        contentType: 'text/plain',
        sizeBytes: 12,
      },
    });
    const documentId = createResponse.json().document.id as string;

    await app.inject({
      method: 'POST',
      url: `/v1/documents/${documentId}/index-demo`,
    });

    const chatResponse = await app.inject({
      method: 'POST',
      url: '/v1/chat',
      payload: {
        documentId,
        question: 'Where does the model layer run?',
      },
    });
    expect(chatResponse.statusCode).toBe(200);
    expect(chatResponse.json()).toMatchObject({
      grounded: true,
      model: 'mock-chat',
    });
    expect(chatResponse.json().citations.length).toBeGreaterThan(0);

    const ungroundedResponse = await app.inject({
      method: 'POST',
      url: '/v1/chat',
      payload: {
        documentId: '00000000-0000-0000-0000-000000000000',
        question: 'What is not indexed here?',
      },
    });
    expect(ungroundedResponse.statusCode).toBe(404);
    expect(ungroundedResponse.json()).toMatchObject({
      grounded: false,
      model: 'mock-chat',
    });

    await app.close();
  });

  it('serves product and study endpoints', async () => {
    const app = await createApp({
      CHAT_PROVIDER: 'mock',
      EMBEDDING_PROVIDER: 'mock',
    });

    const benchmarks = await app.inject({
      method: 'GET',
      url: '/v1/product/benchmarks',
    });
    const studentFeatures = await app.inject({
      method: 'GET',
      url: '/v1/product/student-features',
    });
    const deployments = await app.inject({
      method: 'GET',
      url: '/v1/product/deployments',
    });

    expect(benchmarks.statusCode).toBe(200);
    expect(benchmarks.json().length).toBeGreaterThan(0);
    expect(studentFeatures.statusCode).toBe(200);
    expect(studentFeatures.json().length).toBeGreaterThan(0);
    expect(deployments.statusCode).toBe(200);
    expect(deployments.json().length).toBeGreaterThan(0);

    const createResponse = await app.inject({
      method: 'POST',
      url: '/v1/documents',
      payload: {
        fileName: 'study.txt',
        contentType: 'text/plain',
        sizeBytes: 20,
      },
    });
    const documentId = createResponse.json().document.id as string;
    const studyPack = await app.inject({
      method: 'POST',
      url: '/v1/study-pack',
      payload: {
        documentId,
        focus: 'deployment',
      },
    });

    expect(studyPack.statusCode).toBe(200);
    expect(studyPack.json()).toMatchObject({
      documentId,
      title: 'study.txt study pack',
    });
    expect(studyPack.json().summary).toContain(
      'Focus area requested: deployment.',
    );

    const missingStudyPack = await app.inject({
      method: 'POST',
      url: '/v1/study-pack',
      payload: {
        documentId: '00000000-0000-0000-0000-000000000000',
      },
    });
    expect(missingStudyPack.statusCode).toBe(404);

    await app.close();
  });
});
