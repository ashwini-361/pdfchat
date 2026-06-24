import type { BrowserCapability } from '@doc-chat/shared';

export interface BrowserRuntimeCapabilities {
  webGpu: boolean;
  shaderF16: boolean;
  promptApi: boolean;
  localStorage: boolean;
  reason?: string;
}

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
    note: 'Primary browser-side embeddings powered by Transformers.js when WebGPU is available.',
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
    note: 'Primary browser-side generation path using local models like Gemma.',
  },
];

export const detectBrowserRuntimeCapabilities =
  async (): Promise<BrowserRuntimeCapabilities> => {
    const navigatorWithGpu = globalThis.navigator as
      | (Navigator & {
          gpu?: {
            requestAdapter: () => Promise<{
              features?: {
                has: (feature: string) => boolean;
              };
            } | null>;
          };
        })
      | undefined;
    const windowWithPrompt = globalThis.window as
      | (Window & {
          LanguageModel?: unknown;
          ai?: {
            languageModel?: unknown;
          };
        })
      | undefined;

    if (!navigatorWithGpu?.gpu) {
      return {
        webGpu: false,
        shaderF16: false,
        promptApi: Boolean(
          windowWithPrompt?.LanguageModel ??
          windowWithPrompt?.ai?.languageModel,
        ),
        localStorage: hasLocalStorage(),
        reason: 'WebGPU is not available in this browser.',
      };
    }

    try {
      const adapter = await navigatorWithGpu.gpu.requestAdapter();
      const shaderF16 = Boolean(adapter?.features?.has('shader-f16'));

      return {
        webGpu: Boolean(adapter),
        shaderF16,
        promptApi: Boolean(
          windowWithPrompt?.LanguageModel ??
          windowWithPrompt?.ai?.languageModel,
        ),
        localStorage: hasLocalStorage(),
        reason: adapter ? undefined : 'No WebGPU adapter was found.',
      };
    } catch (error) {
      return {
        webGpu: false,
        shaderF16: false,
        promptApi: Boolean(
          windowWithPrompt?.LanguageModel ??
          windowWithPrompt?.ai?.languageModel,
        ),
        localStorage: hasLocalStorage(),
        reason:
          error instanceof Error
            ? error.message
            : 'Could not inspect WebGPU support.',
      };
    }
  };

const hasLocalStorage = () => {
  try {
    return Boolean(globalThis.localStorage);
  } catch {
    return false;
  }
};
