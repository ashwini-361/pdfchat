export type BrowserLanguageModelFamily = 'gemma' | 'llama' | 'phi';

export interface BrowserLanguageModelOption {
  id: string;
  label: string;
  family: BrowserLanguageModelFamily;
  sizeLabel: string;
  sizeBytes: number;
  modelUrl: string;
  modelLibUrl: string;
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
    id: 'gemma2-2b-it-q4f16-mlc',
    label: 'Gemma2-2B',
    family: 'gemma',
    sizeLabel: '1.38 GB',
    sizeBytes: 1_477_070_487,
    modelUrl:
      'https://uploads.nico.dev/mlc-llm-libs/gemma-2-2b-it-q4f16_1-MLC/',
    modelLibUrl:
      'https://uploads.nico.dev/mlc-llm-libs/gemma-2-2b-it-q4f16_1-MLC/lib/gemma-2-2b-it-q4f16_1-webgpu.wasm',
    requiredFeatures: ['shader-f16'],
    cardUrl: 'https://huggingface.co/google/gemma-2-2b',
  },
  {
    id: 'gemma2-9b-it-q4f16-mlc',
    label: 'Gemma2-9B',
    family: 'gemma',
    sizeLabel: '4.36 GB',
    sizeBytes: 4_677_059_380,
    modelUrl: 'https://uploads.nico.dev/mlc-llm-libs/gemma-2-9b-it_q4f16_MLC/',
    modelLibUrl:
      'https://uploads.nico.dev/mlc-llm-libs/gemma-2-9b-it_q4f16_MLC/lib/gemma-2-9b-it-q4f16_1-webgpu.wasm',
    requiredFeatures: ['shader-f16'],
    cardUrl: 'https://huggingface.co/google/gemma-2-9b-it',
  },
  {
    id: 'phi-3-5-mini-instruct-q4f16-mlc',
    label: 'Phi3.5-mini',
    family: 'phi',
    sizeLabel: '2.01 GB',
    sizeBytes: 2_158_444_553,
    modelUrl: 'https://huggingface.co/mlc-ai/Phi-3.5-mini-instruct-q4f16_1-MLC',
    modelLibUrl:
      'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_48/Phi-3.5-mini-instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm',
    requiredFeatures: ['shader-f16'],
    cardUrl: 'https://huggingface.co/microsoft/Phi-3.5-mini-instruct',
  },
  {
    id: 'llama-3-2-1b-instruct-q4f16-mlc',
    label: 'Llama-3.2-1B-IT',
    family: 'llama',
    sizeLabel: '676.71 MB',
    sizeBytes: 709_579_457,
    modelUrl: 'https://huggingface.co/mlc-ai/Llama-3.2-1B-Instruct-q4f16_1-MLC',
    modelLibUrl:
      'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_48/Llama-3.2-1B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm',
    requiredFeatures: ['shader-f16'],
    cardUrl: 'https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct',
  },
  {
    id: 'llama-3-2-3b-instruct-q4f16-mlc',
    label: 'Llama-3.2-3B-IT',
    family: 'llama',
    sizeLabel: '1.7 GB',
    sizeBytes: 1_823_746_859,
    modelUrl: 'https://huggingface.co/mlc-ai/Llama-3.2-3B-Instruct-q4f16_1-MLC',
    modelLibUrl:
      'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_48/Llama-3.2-3B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm',
    requiredFeatures: ['shader-f16'],
    cardUrl: 'https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct',
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
