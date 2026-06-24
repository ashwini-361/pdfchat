import { describe, expect, it } from 'vitest';

import { chooseBrowserAnswerFallback } from './fallbacks';

const browserCapabilities = {
  webGpu: true,
  promptApi: true,
};

describe('browser answer fallback selection', () => {
  it('uses advanced providers only when the user explicitly selects them', () => {
    expect(
      chooseBrowserAnswerFallback({
        preferredProvider: 'advanced-provider',
        capabilities: browserCapabilities,
      }),
    ).toBe('advanced-provider');
  });

  it('prefers WebLLM when WebGPU is available', () => {
    expect(
      chooseBrowserAnswerFallback({
        preferredProvider: 'browser',
        capabilities: browserCapabilities,
      }),
    ).toBe('webllm');
  });

  it('falls back from WebLLM to Chrome Prompt API', () => {
    expect(
      chooseBrowserAnswerFallback({
        preferredProvider: 'browser',
        capabilities: browserCapabilities,
        webLlmReady: false,
      }),
    ).toBe('prompt-api');
  });

  it('uses extractive local answers without WebGPU or Prompt API', () => {
    expect(
      chooseBrowserAnswerFallback({
        preferredProvider: 'browser',
        capabilities: { webGpu: false, promptApi: false },
      }),
    ).toBe('extractive');
  });
});
