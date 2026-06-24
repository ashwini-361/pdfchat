import type { BrowserEmbeddingModelOption } from './models';

export interface BrowserEmbeddingProgress {
  modelId: string;
  device?: BrowserEmbeddingDevice;
  progress?: number;
  status?: string;
}

export type BrowserEmbeddingDevice = 'webgpu' | 'wasm';

type FeatureExtractor = ((
  texts: string[],
  options: { pooling: 'mean'; normalize: true },
) => Promise<{ tolist: () => number[][] }>) & {
  dispose?: () => Promise<void> | void;
};

export class BrowserEmbeddingEngine {
  private extractor: FeatureExtractor | null = null;
  private activeDevice: BrowserEmbeddingDevice | null = null;

  public constructor(private readonly model: BrowserEmbeddingModelOption) {}

  public get runtimeLabel() {
    return this.activeDevice === 'webgpu' ? 'WebGPU' : 'WASM';
  }

  public async initialize(
    onProgress: (progress: BrowserEmbeddingProgress) => void = () => {},
  ) {
    if (this.extractor) {
      return;
    }

    try {
      await this.initializeWithDevice('webgpu', onProgress);
    } catch {
      await this.initializeWithDevice('wasm', onProgress);
    }
  }

  public async dispose() {
    await this.extractor?.dispose?.();
    this.extractor = null;
    this.activeDevice = null;
  }

  private async initializeWithDevice(
    device: BrowserEmbeddingDevice,
    onProgress: (progress: BrowserEmbeddingProgress) => void,
  ) {
    const { pipeline } = await import('@huggingface/transformers');

    const options: Record<string, unknown> = {
      progress_callback: (progress: { progress?: number; status?: string }) => {
        onProgress({
          modelId: this.model.id,
          device,
          progress: progress.progress,
          status: progress.status,
        });
      },
    };
    if (device === 'webgpu') {
      options.device = 'webgpu';
      options.dtype = 'fp32';
    }

    this.extractor = (await pipeline(
      'feature-extraction',
      this.model.id,
      options,
    )) as FeatureExtractor;
    this.activeDevice = device;
  }

  public async embedTexts(texts: string[]) {
    if (texts.length === 0) {
      return [];
    }

    if (!this.extractor) {
      await this.initialize();
    }

    let result: { tolist: () => number[][] };
    try {
      result = await this.runExtractor(texts);
    } catch (error) {
      if (this.activeDevice !== 'webgpu') {
        throw error;
      }

      await this.dispose();
      await this.initializeWithDevice('wasm', () => {});
      result = await this.runExtractor(texts);
    }

    return result.tolist();
  }

  public async embedQuery(text: string) {
    const [embedding] = await this.embedTexts([text]);
    return embedding ?? [];
  }

  private async runExtractor(texts: string[]) {
    if (!this.extractor) {
      throw new Error('Embedding model is not initialized.');
    }

    return this.extractor(texts, {
      pooling: 'mean',
      normalize: true,
    });
  }
}
