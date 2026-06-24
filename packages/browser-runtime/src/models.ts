export type BrowserLanguageModelFamily = 'gemma' | 'llama' | 'phi';

export interface BrowserLanguageModelOption {
  id: string;
  label: string;
  family: BrowserLanguageModelFamily;
  sizeLabel: string;
  sizeBytes: number;
  requiredFeatures: string[];
  cardUrl: string;
}

export interface BrowserEmbeddingModelOption {
  id: string;
  label: string;
  cardUrl: string;
}

export const browserLanguageModels: BrowserLanguageModelOption[] = [
  {
    id: 'gemma3-1b-it-q4f16_1-MLC',
    label: 'Gemma3-1B',
    family: 'gemma',
    sizeLabel: '711 MB',
    sizeBytes: 745_000_000,
    requiredFeatures: ['shader-f16'],
    cardUrl: 'https://huggingface.co/google/gemma-3-1b-it',
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    label: 'Llama-3.2-1B-IT',
    family: 'llama',
    sizeLabel: '879 MB',
    sizeBytes: 921_740_000,
    requiredFeatures: ['shader-f16'],
    cardUrl: 'https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct',
  },
  {
    id: 'gemma-2-2b-it-q4f16_1-MLC-1k',
    label: 'Gemma2-2B',
    family: 'gemma',
    sizeLabel: '1.58 GB',
    sizeBytes: 1_659_000_000,
    requiredFeatures: ['shader-f16'],
    cardUrl: 'https://huggingface.co/google/gemma-2-2b',
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    label: 'Llama-3.2-3B-IT',
    family: 'llama',
    sizeLabel: '2.26 GB',
    sizeBytes: 2_374_000_000,
    requiredFeatures: ['shader-f16'],
    cardUrl: 'https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct',
  },
  {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC-1k',
    label: 'Phi3.5-mini',
    family: 'phi',
    sizeLabel: '2.52 GB',
    sizeBytes: 2_642_000_000,
    requiredFeatures: ['shader-f16'],
    cardUrl: 'https://huggingface.co/microsoft/Phi-3.5-mini-instruct',
  },
  {
    id: 'gemma-2-9b-it-q4f16_1-MLC',
    label: 'Gemma2-9B',
    family: 'gemma',
    sizeLabel: '6.42 GB',
    sizeBytes: 6_734_000_000,
    requiredFeatures: ['shader-f16'],
    cardUrl: 'https://huggingface.co/google/gemma-2-9b-it',
  },
];

export const browserEmbeddingModels: BrowserEmbeddingModelOption[] = [
  {
    id: 'Xenova/all-MiniLM-L6-v2',
    label: 'Xenova/all-MiniLM-L6-v2',
    cardUrl: 'https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2',
  },
  {
    id: 'Xenova/all-mpnet-base-v2',
    label: 'Xenova/all-mpnet-base-v2',
    cardUrl: 'https://huggingface.co/sentence-transformers/all-mpnet-base-v2',
  },
  {
    id: 'mixedbread-ai/mxbai-embed-large-v1',
    label: 'mixedbread-ai/mxbai-embed-large-v1',
    cardUrl: 'https://huggingface.co/mixedbread-ai/mxbai-embed-large-v1',
  },
  {
    id: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
    label: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
    cardUrl:
      'https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
  },
];

export const defaultBrowserLanguageModelId = browserLanguageModels[0]?.id ?? '';
export const defaultBrowserEmbeddingModelId =
  browserEmbeddingModels[0]?.id ?? '';

export const findBrowserLanguageModel = (modelId: string) =>
  browserLanguageModels.find((model) => model.id === modelId) ??
  browserLanguageModels[0];

export const findBrowserEmbeddingModel = (modelId: string) =>
  browserEmbeddingModels.find((model) => model.id === modelId) ??
  browserEmbeddingModels[0];
