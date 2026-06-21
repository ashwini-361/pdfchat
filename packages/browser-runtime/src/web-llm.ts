export interface WebLlmModelOption {
  id: string;
  label: string;
  family: 'gemma' | 'llama' | 'phi';
  sizeLabel: string;
}

export const defaultWebLlmModels: WebLlmModelOption[] = [
  {
    id: 'gemma-2-2b-it-q4f16_1-MLC',
    label: 'Gemma 2 2B',
    family: 'gemma',
    sizeLabel: '2B',
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 3B',
    family: 'llama',
    sizeLabel: '3B',
  },
  {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    label: 'Phi 3.5 Mini',
    family: 'phi',
    sizeLabel: 'mini',
  },
];

export const describeWebLlmStrategy = () =>
  'Use WebLLM as an optional browser-native inference path for local-first demos, while keeping server-side generation as the production default.';

