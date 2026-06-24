import type { BrowserRuntimeCapabilities } from './capabilities';

export type BrowserAnswerEngine =
  | 'webllm'
  | 'prompt-api'
  | 'extractive'
  | 'advanced-provider';

export const chooseBrowserAnswerFallback = (input: {
  preferredProvider: 'browser' | 'advanced-provider';
  capabilities: Pick<BrowserRuntimeCapabilities, 'webGpu' | 'promptApi'>;
  webLlmReady?: boolean;
}) => {
  if (input.preferredProvider === 'advanced-provider') {
    return 'advanced-provider' satisfies BrowserAnswerEngine;
  }

  if (input.capabilities.webGpu && input.webLlmReady !== false) {
    return 'webllm' satisfies BrowserAnswerEngine;
  }

  if (input.capabilities.promptApi) {
    return 'prompt-api' satisfies BrowserAnswerEngine;
  }

  return 'extractive' satisfies BrowserAnswerEngine;
};
