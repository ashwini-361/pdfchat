import { describe, expect, it } from 'vitest';

import {
  browserRuntimeSettingsKey,
  defaultBrowserRuntimeSettings,
  loadBrowserRuntimeSettings,
  normalizeBrowserRuntimeSettings,
  saveBrowserRuntimeSettings,
} from './settings';

describe('browser runtime settings', () => {
  it('uses browser offline defaults', () => {
    expect(defaultBrowserRuntimeSettings).toMatchObject({
      languageModelId: 'gemma3-1b-it-q4f16_1-MLC',
      embeddingModelId: 'Xenova/all-MiniLM-L6-v2',
      surroundingResults: 3,
      maxResults: 5,
      similarityThreshold: 60,
    });
    expect(defaultBrowserRuntimeSettings.promptTemplate).toContain(
      '{documentTitle}',
    );
    expect(defaultBrowserRuntimeSettings.promptTemplate).toContain('{results}');
    expect(defaultBrowserRuntimeSettings.promptTemplate).toContain(
      '{question}',
    );
  });

  it('normalizes model selections and clamps numeric settings', () => {
    expect(
      normalizeBrowserRuntimeSettings({
        languageModelId: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
        embeddingModelId: 'mixedbread-ai/mxbai-embed-large-v1',
        promptTemplate: 'Answer from {results}',
        surroundingResults: 20,
        maxResults: 0,
        similarityThreshold: 101,
      }),
    ).toMatchObject({
      languageModelId: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
      embeddingModelId: 'mixedbread-ai/mxbai-embed-large-v1',
      promptTemplate: 'Answer from {results}',
      surroundingResults: 8,
      maxResults: 1,
      similarityThreshold: 100,
    });
  });

  it('falls back from invalid stored settings', () => {
    expect(
      normalizeBrowserRuntimeSettings({
        languageModelId: 'ollama/gemma3:4b',
        embeddingModelId: 'server-embedding',
        promptTemplate: '   ',
        surroundingResults: Number.NaN,
        maxResults: Number.POSITIVE_INFINITY,
        similarityThreshold: undefined,
      }),
    ).toEqual(defaultBrowserRuntimeSettings);
  });

  it('loads and saves settings through injected storage', () => {
    const stored = new Map<string, string>();
    const storage = {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
    };

    saveBrowserRuntimeSettings(storage, {
      ...defaultBrowserRuntimeSettings,
      maxResults: 7,
      similarityThreshold: 45,
    });

    expect(
      JSON.parse(stored.get(browserRuntimeSettingsKey) ?? '{}'),
    ).toMatchObject({
      maxResults: 7,
      similarityThreshold: 45,
    });
    expect(loadBrowserRuntimeSettings(storage)).toMatchObject({
      maxResults: 7,
      similarityThreshold: 45,
    });
  });

  it('returns defaults when storage is missing or malformed', () => {
    expect(loadBrowserRuntimeSettings(undefined)).toEqual(
      defaultBrowserRuntimeSettings,
    );
    expect(
      loadBrowserRuntimeSettings({
        getItem: () => '{broken-json',
      }),
    ).toEqual(defaultBrowserRuntimeSettings);
  });
});
