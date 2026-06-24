import type { BrowserEmbeddingModelOption } from './models';

export interface BrowserEmbeddingProgress {
  modelId: string;
  progress?: number;
  status?: string;
}

export class BrowserEmbeddingEngine {
  private extractor: unknown = null;

  public constructor(private readonly model: BrowserEmbeddingModelOption) {}

  public async initialize(
    onProgress: (progress: BrowserEmbeddingProgress) => void = () => {},
  ) {
    if (this.extractor) {
      return;
    }

    const { pipeline } = await import('@huggingface/transformers');
    this.extractor = await pipeline('feature-extraction', this.model.id, {
      device: 'webgpu',
      dtype: 'fp32',
      progress_callback: (progress: { progress?: number; status?: string }) => {
        onProgress({
          modelId: this.model.id,
          progress: progress.progress,
          status: progress.status,
        });
      },
    });
  }

  public async embedTexts(texts: string[]) {
    if (texts.length === 0) {
      return [];
    }

    if (!this.extractor) {
      await this.initialize();
    }

    const extractor = this.extractor as (
      texts: string[],
      options: { pooling: 'mean'; normalize: true },
    ) => Promise<{ tolist: () => number[][] }>;
    const result = await extractor(texts, {
      pooling: 'mean',
      normalize: true,
    });

    return result.tolist();
  }

  public async embedQuery(text: string) {
    const [embedding] = await this.embedTexts([text]);
    return embedding ?? [];
  }
}
