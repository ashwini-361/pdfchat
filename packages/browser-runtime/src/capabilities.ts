import type { BrowserCapability } from '@doc-chat/shared';

export const referenceInspiredCapabilities = (
  flags: Record<string, boolean>,
): BrowserCapability[] => [
  {
    id: 'local-pdf-parse',
    label: 'Browser PDF parsing',
    enabled: flags.browserRagEnabled,
    note: 'Parse and preview document content in the browser before upload.',
  },
  {
    id: 'local-embeddings',
    label: 'Local embeddings',
    enabled: flags.browserRagEnabled,
    note: 'Optional browser-side embeddings inspired by Transformers.js usage.',
  },
  {
    id: 'in-memory-search',
    label: 'In-memory retrieval',
    enabled: flags.browserRagEnabled,
    note: 'Lightweight local search mode for demos and privacy-first experiments.',
  },
  {
    id: 'web-llm-chat',
    label: 'WebLLM local chat',
    enabled: flags.webLlmEnabled,
    note: 'Optional browser-side generation path using local models like Gemma.',
  },
];

