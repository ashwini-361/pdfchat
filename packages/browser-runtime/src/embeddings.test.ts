import { afterEach, describe, expect, it, vi } from 'vitest';

const pipelineMock = vi.hoisted(() => vi.fn());

vi.mock('@huggingface/transformers', () => ({
  pipeline: pipelineMock,
}));

import { BrowserEmbeddingEngine } from './embeddings';
import type { BrowserEmbeddingModelOption } from './models';

const model: BrowserEmbeddingModelOption = {
  id: 'test-embedding-model',
  label: 'Test embedding model',
  cardUrl: 'https://example.test/model',
};

describe('BrowserEmbeddingEngine', () => {
  afterEach(() => {
    pipelineMock.mockReset();
  });

  it('uses WebGPU first for browser embeddings', async () => {
    const extractor = vi.fn().mockResolvedValue({
      tolist: () => [[1, 0]],
    });
    pipelineMock.mockResolvedValue(extractor);
    const engine = new BrowserEmbeddingEngine(model);

    await engine.initialize();
    const vectors = await engine.embedTexts(['browser local model']);

    expect(vectors).toEqual([[1, 0]]);
    expect(engine.runtimeLabel).toBe('WebGPU');
    expect(pipelineMock).toHaveBeenCalledWith(
      'feature-extraction',
      'test-embedding-model',
      expect.objectContaining({
        device: 'webgpu',
        dtype: 'fp32',
      }),
    );
  });

  it('falls back to browser WASM when WebGPU execution fails', async () => {
    const dispose = vi.fn();
    const webGpuExtractor = Object.assign(
      vi.fn().mockRejectedValue(new Error('OrtRun failed')),
      { dispose },
    );
    const wasmExtractor = vi.fn().mockResolvedValue({
      tolist: () => [[0.5, 0.5]],
    });
    pipelineMock
      .mockResolvedValueOnce(webGpuExtractor)
      .mockResolvedValueOnce(wasmExtractor);
    const engine = new BrowserEmbeddingEngine(model);

    await engine.initialize();
    const vectors = await engine.embedTexts(['machine learning']);
    const wasmOptions = pipelineMock.mock.calls[1]?.[2] as
      | Record<string, unknown>
      | undefined;

    expect(vectors).toEqual([[0.5, 0.5]]);
    expect(engine.runtimeLabel).toBe('WASM');
    expect(dispose).toHaveBeenCalled();
    expect(wasmOptions?.device).toBeUndefined();
  });
});
