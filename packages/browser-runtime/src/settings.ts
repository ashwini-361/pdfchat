import {
  browserEmbeddingModels,
  browserLanguageModels,
  defaultBrowserEmbeddingModelId,
  defaultBrowserLanguageModelId,
} from './models';

export interface BrowserRuntimeSettings {
  languageModelId: string;
  embeddingModelId: string;
  promptTemplate: string;
  surroundingResults: number;
  maxResults: number;
  similarityThreshold: number;
}

export const browserRuntimeSettingsKey = 'doc-chat-browser-runtime-settings';

export const defaultPromptTemplate = `INSTRUCTIONS:
DOCUMENT contains parts of the {documentTitle}
Answer the user's QUESTION using the DOCUMENT text below.
Keep your answer grounded in the facts of the DOCUMENT.
If the DOCUMENT doesn't contain the facts to answer the QUESTION, say that you can't answer the question.
Answer in Markdown format

DOCUMENT:
{results}

QUESTION:
{question}`;

export const defaultBrowserRuntimeSettings: BrowserRuntimeSettings = {
  languageModelId: defaultBrowserLanguageModelId,
  embeddingModelId: defaultBrowserEmbeddingModelId,
  promptTemplate: defaultPromptTemplate,
  surroundingResults: 3,
  maxResults: 5,
  similarityThreshold: 60,
};

export const normalizeBrowserRuntimeSettings = (
  value: Partial<BrowserRuntimeSettings> = {},
): BrowserRuntimeSettings => {
  const languageModelId =
    typeof value.languageModelId === 'string' &&
    browserLanguageModels.some((model) => model.id === value.languageModelId)
      ? value.languageModelId
      : defaultBrowserRuntimeSettings.languageModelId;
  const embeddingModelId =
    typeof value.embeddingModelId === 'string' &&
    browserEmbeddingModels.some((model) => model.id === value.embeddingModelId)
      ? value.embeddingModelId
      : defaultBrowserRuntimeSettings.embeddingModelId;

  return {
    languageModelId,
    embeddingModelId,
    promptTemplate:
      typeof value.promptTemplate === 'string' && value.promptTemplate.trim()
        ? value.promptTemplate
        : defaultBrowserRuntimeSettings.promptTemplate,
    surroundingResults: clampInteger(value.surroundingResults, 0, 8, 3),
    maxResults: clampInteger(value.maxResults, 1, 12, 5),
    similarityThreshold: clampInteger(value.similarityThreshold, 0, 100, 60),
  };
};

export const loadBrowserRuntimeSettings = (
  storage: Pick<Storage, 'getItem'> | undefined,
) => {
  if (!storage) {
    return defaultBrowserRuntimeSettings;
  }

  try {
    const stored = storage.getItem(browserRuntimeSettingsKey);
    return normalizeBrowserRuntimeSettings(stored ? JSON.parse(stored) : {});
  } catch {
    return defaultBrowserRuntimeSettings;
  }
};

export const saveBrowserRuntimeSettings = (
  storage: Pick<Storage, 'setItem'> | undefined,
  settings: BrowserRuntimeSettings,
) => {
  storage?.setItem(
    browserRuntimeSettingsKey,
    JSON.stringify(normalizeBrowserRuntimeSettings(settings)),
  );
};

const clampInteger = (
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
};
