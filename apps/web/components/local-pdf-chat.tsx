'use client';

import {
  BrowserEmbeddingEngine,
  BrowserWebLlmEngine,
  browserEmbeddingModels,
  browserLanguageModels,
  chooseBrowserAnswerFallback,
  createBrowserDocumentChunks,
  createVectorEntries,
  defaultBrowserRuntimeSettings,
  detectBrowserRuntimeCapabilities,
  expandRetrievedChunks,
  extractiveBrowserAnswer,
  findBrowserEmbeddingModel,
  findBrowserLanguageModel,
  interpolateBrowserPrompt,
  loadBrowserRuntimeSettings,
  normalizeBrowserRuntimeSettings,
  saveBrowserRuntimeSettings,
  searchTerms,
  searchVectorEntries,
  splitBrowserSentences,
  tokenizeBrowserText,
} from '@doc-chat/browser-runtime';
import type {
  BrowserDocumentChunk,
  BrowserDocumentPage,
  BrowserRetrievedChunk,
  BrowserRuntimeCapabilities,
  BrowserRuntimeSettings,
  BrowserVectorEntry,
} from '@doc-chat/browser-runtime';
import { useEffect, useMemo, useRef, useState } from 'react';

type ProcessingState = 'idle' | 'reading' | 'ready' | 'answering' | 'error';
type LearningTab =
  | 'chat'
  | 'summary'
  | 'flashcards'
  | 'notes'
  | 'words'
  | 'quiz';
type ProviderId =
  | 'browser'
  | 'openai'
  | 'openrouter'
  | 'nvidia'
  | 'ollama'
  | 'vllm'
  | 'llamacpp'
  | 'lemonade'
  | 'custom';

type PdfPage = BrowserDocumentPage;
type PdfChunk = BrowserDocumentChunk;
type RetrievedChunk = BrowserRetrievedChunk;

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: RetrievedChunk[];
};

type TocItem = {
  id: string;
  title: string;
  page: number;
};

type ProviderPreset = {
  id: ProviderId;
  label: string;
  baseUrl: string;
  model: string;
  needsKey: boolean;
  note: string;
};

type PromptMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type ChromeLanguageModel = {
  availability?: () => Promise<
    'unavailable' | 'downloadable' | 'downloading' | 'available'
  >;
  create: () => Promise<{
    prompt: (messages: PromptMessage[] | string) => Promise<string>;
  }>;
};

declare global {
  interface Window {
    LanguageModel?: ChromeLanguageModel;
    ai?: {
      languageModel?: ChromeLanguageModel;
    };
  }
}

const providerPresets: ProviderPreset[] = [
  {
    id: 'browser',
    label: 'Browser offline',
    baseUrl: '',
    model: 'WebLLM/WebGPU',
    needsKey: false,
    note: 'Runs local WebLLM first, then Chrome Prompt API, then extractive PDF answer.',
  },
  {
    id: 'ollama',
    label: 'Ollama backend',
    baseUrl: 'http://localhost:11434/v1',
    model: 'gemma3:4b',
    needsKey: false,
    note: 'Optional advanced provider. Browser offline mode does not need Ollama.',
  },
  {
    id: 'vllm',
    label: 'vLLM',
    baseUrl: 'http://localhost:8000/v1',
    model: 'meta-llama/Llama-3.1-8B-Instruct',
    needsKey: false,
    note: 'Optional OpenAI-compatible backend serving.',
  },
  {
    id: 'llamacpp',
    label: 'llama.cpp',
    baseUrl: 'http://localhost:8080/v1',
    model: 'local-model',
    needsKey: false,
    note: 'Optional llama-server OpenAI-compatible backend.',
  },
  {
    id: 'lemonade',
    label: 'Lemonade',
    baseUrl: 'http://localhost:8000/v1',
    model: 'llama',
    needsKey: false,
    note: 'Optional Lemonade OpenAI-compatible local server.',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'google/gemma-3-4b-it',
    needsKey: true,
    note: 'Optional hosted provider. Requires an API key.',
  },
  {
    id: 'nvidia',
    label: 'NVIDIA',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    model: 'nvidia/llama-3.1-nemotron-nano-8b-v1',
    needsKey: true,
    note: 'Optional NVIDIA NIM OpenAI-compatible chat completions.',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4.1-mini',
    needsKey: true,
    note: 'Optional hosted provider for stronger online answers.',
  },
  {
    id: 'custom',
    label: 'Custom API',
    baseUrl: 'http://localhost:1234/v1',
    model: 'local-model',
    needsKey: false,
    note: 'Any OpenAI-compatible endpoint, including local gateways.',
  },
];

const sampleQuestions = [
  'Explain this like I am in class 8.',
  'What are the 5 most important exam points?',
  'Make a funny quiz from this PDF.',
  'What difficult words should I learn?',
];

const defaultCapabilities: BrowserRuntimeCapabilities = {
  webGpu: false,
  shaderF16: false,
  promptApi: false,
  localStorage: false,
  reason: 'Checking browser runtime...',
};

const summarizeModelError = (error: unknown, fallback: string) => {
  const message = error instanceof Error ? error.message : '';
  if (/OrtRun|mapAsync|GPUBuffer|WebGPU|external Instance/i.test(message)) {
    return `WebGPU model execution failed. ${fallback}`;
  }
  if (/WebAssembly|TVMWasmPackedCFunc|model_lib/i.test(message)) {
    return `WebLLM model library failed to load. ${fallback}`;
  }
  if (/fetch|network|download/i.test(message)) {
    return `Model download failed. ${fallback}`;
  }

  return message ? `${fallback} ${message}` : fallback;
};

const bestSentences = (text: string, query = '', limit = 5) => {
  const queryTerms = new Set(tokenizeBrowserText(query));
  return splitBrowserSentences(text)
    .filter((sentence) => sentence.length > 35)
    .map((sentence) => ({
      sentence,
      score:
        tokenizeBrowserText(sentence).reduce(
          (total, term) => total + (queryTerms.has(term) ? 2 : 0),
          0,
        ) + Math.min(sentence.length / 180, 2),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.sentence);
};

const generateToc = (pages: PdfPage[]) => {
  const toc: TocItem[] = [];
  for (const page of pages) {
    const candidates = page.text
      .split(/\n|(?<=\.)\s+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 8 && line.length < 90);
    const title =
      candidates.find((line) => /^[A-Z0-9][A-Za-z0-9\s:,-]+$/.test(line)) ??
      splitBrowserSentences(page.text)[0] ??
      `Page ${page.page}`;
    toc.push({
      id: `toc-${page.page}`,
      page: page.page,
      title: title.slice(0, 80),
    });
  }
  return toc.slice(0, 18);
};

const makeLearningPack = (pages: PdfPage[], chunks: PdfChunk[]) => {
  const fullText = pages.map((page) => page.text).join(' ');
  const important = bestSentences(
    fullText,
    'important main explain remember',
    7,
  );
  const terms = [
    ...chunks.reduce((map, chunk) => {
      for (const [term, count] of chunk.terms) {
        map.set(term, (map.get(term) ?? 0) + count);
      }
      return map;
    }, new Map<string, number>()),
  ]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([term]) => term);

  return {
    summary: important.slice(0, 4),
    notes: important.map(
      (sentence, index) => `Point ${index + 1}: ${sentence}`,
    ),
    flashcards: important.slice(0, 6).map((sentence, index) => ({
      question: `Card ${index + 1}: What does this idea mean?`,
      answer: sentence,
    })),
    words: terms.map((term) => ({
      word: term,
      meaning: `In this PDF, "${term}" is an important word. Search the cited text and explain it in your own words.`,
    })),
    quiz: important.slice(0, 6).map((sentence, index) => ({
      question:
        index % 2 === 0
          ? `Tiny teacher question ${index + 1}: Can you explain this in one sentence?`
          : `Silly but serious question ${index + 1}: If this idea was a school notice, what would it say?`,
      answer: sentence,
    })),
  };
};

export const LocalPdfChat = () => {
  const [state, setState] = useState<ProcessingState>('idle');
  const [activeTab, setActiveTab] = useState<LearningTab>('chat');
  const [fileName, setFileName] = useState<string | null>(null);
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [chunks, setChunks] = useState<PdfChunk[]>([]);
  const [vectorEntries, setVectorEntries] = useState<BrowserVectorEntry[]>([]);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [statusMessage, setStatusMessage] = useState('Add a PDF to begin.');
  const [engine, setEngine] = useState('Waiting for PDF');
  const [retrievalEngine, setRetrievalEngine] = useState('No index yet');
  const [runtimeStatus, setRuntimeStatus] = useState(
    'Checking browser runtime...',
  );
  const [runtimeSettings, setRuntimeSettings] =
    useState<BrowserRuntimeSettings>(defaultBrowserRuntimeSettings);
  const [runtimeCapabilities, setRuntimeCapabilities] =
    useState<BrowserRuntimeCapabilities>(defaultCapabilities);
  const [providerId, setProviderId] = useState<ProviderId>('browser');
  const [apiKey, setApiKey] = useState('');
  const [customBaseUrl, setCustomBaseUrl] = useState(
    providerPresets.at(-1)?.baseUrl ?? '',
  );
  const [customModel, setCustomModel] = useState(
    providerPresets.at(-1)?.model ?? '',
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<TocItem[]>([]);
  const [selectedPage, setSelectedPage] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const webLlmRef = useRef<{
    modelId: string;
    engine: BrowserWebLlmEngine;
  } | null>(null);
  const embeddingRef = useRef<{
    modelId: string;
    engine: BrowserEmbeddingEngine;
  } | null>(null);

  useEffect(() => {
    setRuntimeSettings(loadBrowserRuntimeSettings(globalThis.localStorage));
    void detectBrowserRuntimeCapabilities().then((capabilities) => {
      setRuntimeCapabilities(capabilities);
      setRuntimeStatus(
        capabilities.webGpu
          ? 'WebGPU ready for browser-local models.'
          : (capabilities.reason ?? 'Browser WebGPU is unavailable.'),
      );
    });
  }, []);

  const selectedPreset =
    providerPresets.find((provider) => provider.id === providerId) ??
    providerPresets[0];
  const activeProvider =
    providerId === 'custom'
      ? { ...selectedPreset, baseUrl: customBaseUrl, model: customModel }
      : selectedPreset;
  const canAsk = state === 'ready' && question.trim().length > 0;
  const toc = useMemo(() => generateToc(pages), [pages]);
  const learningPack = useMemo(
    () => makeLearningPack(pages, chunks),
    [pages, chunks],
  );
  const pagePreview =
    pages.find((page) => page.page === selectedPage)?.text ?? '';
  const activeLanguageModel = findBrowserLanguageModel(
    runtimeSettings.languageModelId,
  );
  const activeEmbeddingModel = findBrowserEmbeddingModel(
    runtimeSettings.embeddingModelId,
  );

  const getEmbeddingEngine = (settings = runtimeSettings) => {
    const model = findBrowserEmbeddingModel(settings.embeddingModelId);
    if (embeddingRef.current?.modelId !== model.id) {
      embeddingRef.current = {
        modelId: model.id,
        engine: new BrowserEmbeddingEngine(model),
      };
    }

    return embeddingRef.current.engine;
  };

  const getWebLlmEngine = (settings = runtimeSettings) => {
    const model = findBrowserLanguageModel(settings.languageModelId);
    if (webLlmRef.current?.modelId !== model.id) {
      webLlmRef.current = {
        modelId: model.id,
        engine: new BrowserWebLlmEngine(model),
      };
    }

    return webLlmRef.current.engine;
  };

  const indexChunksWithBrowserEmbeddings = async (
    nextChunks: PdfChunk[],
    settings = runtimeSettings,
  ) => {
    if (!runtimeCapabilities.webGpu) {
      setVectorEntries([]);
      setRetrievalEngine('Local term retrieval');
      return false;
    }

    try {
      const embeddingModel = findBrowserEmbeddingModel(
        settings.embeddingModelId,
      );
      setStatusMessage(`Indexing locally with ${embeddingModel.label}...`);
      const embeddingEngine = getEmbeddingEngine(settings);
      await embeddingEngine.initialize((progress) => {
        setRuntimeStatus(
          progress.progress
            ? `Embedding model download ${Math.round(progress.progress)}%`
            : `Preparing ${embeddingModel.label}`,
        );
      });
      const vectors = await embeddingEngine.embedTexts(
        nextChunks.map((chunk) => chunk.text),
      );
      setVectorEntries(createVectorEntries(nextChunks, vectors));
      setRetrievalEngine(
        `${embeddingEngine.runtimeLabel} embeddings: ${embeddingModel.label}`,
      );
      setRuntimeStatus(
        `Browser embedding index ready with ${embeddingEngine.runtimeLabel}.`,
      );
      return true;
    } catch (error) {
      setVectorEntries([]);
      setRetrievalEngine('Local term retrieval');
      setRuntimeStatus(
        summarizeModelError(error, 'Using local term retrieval for this PDF.'),
      );
      return false;
    }
  };

  const readPdf = async (file: File) => {
    setState('reading');
    setFileName(file.name);
    setMessages([]);
    setChunks([]);
    setVectorEntries([]);
    setPages([]);
    setBookmarks([]);
    setSelectedPage(1);
    setEngine('PDF.js local parser');
    setRetrievalEngine('No index yet');
    setStatusMessage('Reading PDF text in this browser...');

    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/legacy/build/pdf.worker.mjs',
        import.meta.url,
      ).toString();
      const data = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data }).promise;
      const nextPages: PdfPage[] = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        setStatusMessage(`Extracting page ${pageNumber} of ${pdf.numPages}...`);
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const text = content.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (text) {
          nextPages.push({ page: pageNumber, text });
        }
      }

      const nextChunks = createBrowserDocumentChunks(nextPages);
      setPages(nextPages);
      setChunks(nextChunks);

      const indexedWithEmbeddings = await indexChunksWithBrowserEmbeddings(
        nextChunks,
        runtimeSettings,
      );
      setState('ready');
      setStatusMessage(
        `Ready. Indexed ${nextChunks.length} chunks from ${pdf.numPages} pages ${
          indexedWithEmbeddings
            ? 'with browser embeddings.'
            : 'with local term search.'
        }`,
      );
    } catch (error) {
      setState('error');
      setStatusMessage(
        error instanceof Error ? error.message : 'Could not read this PDF.',
      );
    }
  };

  const retrieveSources = async (questionText: string) => {
    if (vectorEntries.length > 0) {
      try {
        const queryVector = await getEmbeddingEngine().embedQuery(questionText);
        const vectorResults = searchVectorEntries(queryVector, vectorEntries, {
          maxResults: runtimeSettings.maxResults,
          similarityThreshold: runtimeSettings.similarityThreshold,
        });
        if (vectorResults.length > 0) {
          setRetrievalEngine(
            `${getEmbeddingEngine().runtimeLabel} embeddings: ${activeEmbeddingModel.label}`,
          );
          return vectorResults;
        }
      } catch (error) {
        setRuntimeStatus(
          summarizeModelError(error, 'Using local term retrieval.'),
        );
      }
    }

    setRetrievalEngine('Local term retrieval');
    return searchTerms(questionText, chunks, {
      maxResults: runtimeSettings.maxResults,
      similarityThreshold: runtimeSettings.similarityThreshold,
    });
  };

  const buildGroundedPrompt = (
    questionText: string,
    sources: BrowserRetrievedChunk[],
  ) => {
    const expanded = expandRetrievedChunks(
      sources,
      chunks,
      runtimeSettings.surroundingResults,
    );
    const results = (expanded.length > 0 ? expanded : sources).map(
      (source) => `[page ${source.page}] ${source.text}`,
    );

    return interpolateBrowserPrompt(runtimeSettings.promptTemplate, {
      documentTitle: fileName ?? 'Untitled PDF',
      results,
      question: questionText,
    });
  };

  const askBrowserWebLlm = async (prompt: string) => {
    if (!runtimeCapabilities.webGpu) {
      return null;
    }

    if (
      activeLanguageModel.requiredFeatures.includes('shader-f16') &&
      !runtimeCapabilities.shaderF16
    ) {
      setRuntimeStatus('WebLLM fallback: this GPU does not expose shader-f16.');
      return null;
    }

    try {
      const webLlm = getWebLlmEngine();
      await webLlm.initialize((progress) => {
        setRuntimeStatus(
          progress.progress
            ? `Language model download ${Math.round(progress.progress)}%`
            : `Preparing ${activeLanguageModel.label}`,
        );
      });
      const answer = await webLlm.generate(
        [{ role: 'user', content: prompt }],
        (progress) => {
          setRuntimeStatus(`Generating with ${progress.modelId}`);
        },
      );
      return answer.trim() || null;
    } catch (error) {
      setRuntimeStatus(
        summarizeModelError(error, 'Trying the next browser fallback.'),
      );
      return null;
    }
  };

  const askBuiltInPrompt = async (prompt: string) => {
    const languageModel = window.LanguageModel ?? window.ai?.languageModel;
    if (!languageModel) {
      return null;
    }

    const availability = await languageModel.availability?.();
    if (availability === 'unavailable') {
      return null;
    }

    const session = await languageModel.create();
    return session.prompt([{ role: 'user', content: prompt }]);
  };

  const askOpenAiCompatible = async (
    provider: ProviderPreset,
    apiKey: string,
    prompt: string,
  ) => {
    if (!provider.baseUrl) {
      return null;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey.trim()) {
      headers.Authorization = `Bearer ${apiKey.trim()}`;
    }
    if (provider.id === 'openrouter') {
      headers['HTTP-Referer'] = 'http://localhost:3000';
      headers['X-Title'] = 'Ask my PDF student demo';
    }

    const response = await fetch(
      `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: provider.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.25,
          max_tokens: 700,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Model API returned ${response.status}. Check CORS, base URL, model name, or API key.`,
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return payload.choices?.[0]?.message?.content ?? null;
  };

  const answerQuestion = async (questionText = question) => {
    if (state !== 'ready' || questionText.trim().length === 0) {
      return;
    }

    const cleanQuestion = questionText.trim();
    const sources = await retrieveSources(cleanQuestion);
    const prompt = buildGroundedPrompt(cleanQuestion, sources);
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: 'user', content: cleanQuestion },
    ]);
    setQuestion('');
    setState('answering');
    setStatusMessage('Answering from local PDF context...');

    try {
      let answer: string | null = null;
      let answerEngine = 'Local extractive answer';
      if (activeProvider.id === 'browser') {
        const fallback = chooseBrowserAnswerFallback({
          preferredProvider: 'browser',
          capabilities: runtimeCapabilities,
        });
        if (fallback === 'webllm') {
          setStatusMessage(
            `Trying ${activeLanguageModel.label} in this browser...`,
          );
          answer = await askBrowserWebLlm(prompt);
          if (answer) {
            answerEngine = activeLanguageModel.label;
          }
        }
        if (!answer) {
          setStatusMessage('Trying Chrome Prompt API fallback...');
          answer = await askBuiltInPrompt(prompt);
          if (answer) {
            answerEngine = 'Chrome Prompt API';
          }
        }
      } else {
        setStatusMessage(
          `Asking optional provider: ${activeProvider.label}...`,
        );
        answer = await askOpenAiCompatible(activeProvider, apiKey, prompt);
        answerEngine = activeProvider.label;
      }
      setEngine(answerEngine);

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: answer ?? extractiveBrowserAnswer(cleanQuestion, sources),
          sources,
        },
      ]);
      setStatusMessage('Answer grounded in retrieved PDF chunks.');
    } catch (error) {
      setEngine('Local extractive answer');
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `${extractiveBrowserAnswer(cleanQuestion, sources)}\n\nModel note: ${
            error instanceof Error
              ? error.message
              : 'Provider failed, so the offline local fallback answered.'
          }`,
          sources,
        },
      ]);
      setStatusMessage('Provider failed, so offline local retrieval answered.');
    } finally {
      setState('ready');
    }
  };

  const saveSettings = async (settings: BrowserRuntimeSettings) => {
    const normalized = normalizeBrowserRuntimeSettings(settings);
    setRuntimeSettings(normalized);
    saveBrowserRuntimeSettings(globalThis.localStorage, normalized);
    if (chunks.length > 0) {
      await indexChunksWithBrowserEmbeddings(chunks, normalized);
    }
    setRuntimeStatus('Browser runtime settings saved.');
  };

  const addBookmark = (item: TocItem) => {
    setBookmarks((current) =>
      current.some((bookmark) => bookmark.id === item.id)
        ? current
        : [...current, item],
    );
  };

  return (
    <section className="pdf-demo-shell" aria-label="Local PDF learning demo">
      <nav className="pdf-demo-nav">
        <button className="brand-button" type="button">
          Ask my PDF
        </button>
        <div className="nav-links" aria-label="Demo links">
          <button type="button" onClick={() => setActiveTab('summary')}>
            Summary
          </button>
          <button type="button" onClick={() => setActiveTab('flashcards')}>
            Flashcards
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen((open) => !open)}
          >
            Settings
          </button>
        </div>
      </nav>

      {settingsOpen ? (
        <section className="settings-dock" aria-label="Model provider settings">
          <div>
            <span>Answer mode</span>
            <select
              value={providerId}
              onChange={(event) =>
                setProviderId(event.target.value as ProviderId)
              }
            >
              {providerPresets.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.label}
                </option>
              ))}
            </select>
            <p>{activeProvider.note}</p>
          </div>

          <label>
            Language model
            <select
              value={runtimeSettings.languageModelId}
              onChange={(event) =>
                setRuntimeSettings((current) => ({
                  ...current,
                  languageModelId: event.target.value,
                }))
              }
            >
              {browserLanguageModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label} ({model.sizeLabel})
                </option>
              ))}
            </select>
          </label>

          <label>
            Embedding model
            <select
              value={runtimeSettings.embeddingModelId}
              onChange={(event) =>
                setRuntimeSettings((current) => ({
                  ...current,
                  embeddingModelId: event.target.value,
                }))
              }
            >
              {browserEmbeddingModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </label>

          <div className="runtime-pills">
            <span>
              {runtimeCapabilities.webGpu
                ? 'WebGPU ready'
                : 'WebGPU unavailable'}
            </span>
            <span>
              {runtimeCapabilities.shaderF16
                ? 'shader-f16 ready'
                : 'shader-f16 missing'}
            </span>
            <span>
              {runtimeCapabilities.promptApi
                ? 'Prompt API ready'
                : 'Prompt API unavailable'}
            </span>
            <span>{retrievalEngine}</span>
          </div>

          <label className="settings-wide">
            Prompt template
            <textarea
              className="settings-textarea"
              value={runtimeSettings.promptTemplate}
              onChange={(event) =>
                setRuntimeSettings((current) => ({
                  ...current,
                  promptTemplate: event.target.value,
                }))
              }
            />
          </label>

          <label>
            Surrounding results
            <input
              type="range"
              min="0"
              max="8"
              value={runtimeSettings.surroundingResults}
              onChange={(event) =>
                setRuntimeSettings((current) => ({
                  ...current,
                  surroundingResults: Number(event.target.value),
                }))
              }
            />
            <strong>{runtimeSettings.surroundingResults}</strong>
          </label>

          <label>
            Max results
            <input
              type="range"
              min="1"
              max="12"
              value={runtimeSettings.maxResults}
              onChange={(event) =>
                setRuntimeSettings((current) => ({
                  ...current,
                  maxResults: Number(event.target.value),
                }))
              }
            />
            <strong>{runtimeSettings.maxResults}</strong>
          </label>

          <label>
            Similarity threshold
            <input
              type="range"
              min="0"
              max="100"
              value={runtimeSettings.similarityThreshold}
              onChange={(event) =>
                setRuntimeSettings((current) => ({
                  ...current,
                  similarityThreshold: Number(event.target.value),
                }))
              }
            />
            <strong>{runtimeSettings.similarityThreshold}%</strong>
          </label>

          {providerId !== 'browser' ? (
            <>
              <label>
                Base URL
                <input
                  value={
                    providerId === 'custom'
                      ? customBaseUrl
                      : activeProvider.baseUrl
                  }
                  disabled={providerId !== 'custom'}
                  onChange={(event) => setCustomBaseUrl(event.target.value)}
                />
              </label>
              <label>
                Model
                <input
                  value={
                    providerId === 'custom' ? customModel : activeProvider.model
                  }
                  disabled={providerId !== 'custom'}
                  onChange={(event) => setCustomModel(event.target.value)}
                />
              </label>
              <label>
                API key
                <input
                  type="password"
                  value={apiKey}
                  placeholder={
                    activeProvider.needsKey
                      ? 'Required for this provider'
                      : 'Optional for local servers'
                  }
                  onChange={(event) => setApiKey(event.target.value)}
                />
              </label>
            </>
          ) : null}

          <div className="settings-actions settings-wide">
            <button
              type="button"
              onClick={() => void saveSettings(defaultBrowserRuntimeSettings)}
            >
              Reset to Default
            </button>
            <button
              type="button"
              onClick={() => void saveSettings(runtimeSettings)}
            >
              Save Settings
            </button>
            <p>{runtimeStatus}</p>
          </div>
        </section>
      ) : null}

      <div className="pdf-demo-grid">
        <aside
          className="pdf-drop-panel"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files[0];
            if (file?.type === 'application/pdf') void readPdf(file);
          }}
        >
          <input
            ref={inputRef}
            className="hidden-input"
            type="file"
            accept="application/pdf"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void readPdf(file);
            }}
          />
          <button
            className="read-pdf-button"
            type="button"
            onClick={() => inputRef.current?.click()}
          >
            <span aria-hidden="true">PDF</span>
            Read PDF
          </button>
          <div className="reader-note">
            <p>
              Drop a selectable-text PDF. It is parsed, indexed, searched, and
              answered locally in the browser first.
            </p>
          </div>
          <div className="pdf-status-board">
            <span>{state.toUpperCase()}</span>
            <strong>{statusMessage}</strong>
            {fileName ? <p>{fileName}</p> : null}
          </div>
          <div className="toc-panel">
            <strong>Table of contents</strong>
            {toc.length === 0 ? (
              <p>Add a PDF to generate a simple page map.</p>
            ) : (
              toc.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedPage(item.page)}
                >
                  <span>p{item.page}</span>
                  {item.title}
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="pdf-chat-panel">
          <div className="learning-tabs">
            {(
              [
                'chat',
                'summary',
                'flashcards',
                'notes',
                'words',
                'quiz',
              ] as LearningTab[]
            ).map((tab) => (
              <button
                key={tab}
                className={activeTab === tab ? 'active-tab' : ''}
                type="button"
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'chat' ? (
            <>
              <div className="chat-window" aria-live="polite">
                {messages.length === 0 ? (
                  <div className="empty-chat">
                    <p>Please add a document for which you have questions.</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <article
                      className={`chat-bubble chat-bubble-${message.role}`}
                      key={message.id}
                    >
                      <p>{message.content}</p>
                      {message.sources ? (
                        <div className="source-list">
                          <strong>Sources</strong>
                          {message.sources.map((source) => (
                            <span key={source.id}>
                              Page {source.page}: {source.text.slice(0, 130)}...
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
              <form
                className="question-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void answerQuestion();
                }}
              >
                <textarea
                  value={question}
                  disabled={state !== 'ready'}
                  placeholder={
                    state === 'ready'
                      ? 'Ask like: explain this concept with an example'
                      : 'Upload a PDF first'
                  }
                  onChange={(event) => setQuestion(event.target.value)}
                />
                <button type="submit" disabled={!canAsk}>
                  {state === 'answering' ? 'Thinking' : "Let's go"}
                </button>
              </form>
            </>
          ) : (
            <LearningPanel
              tab={activeTab}
              pack={learningPack}
              pagePreview={pagePreview}
            />
          )}
        </section>
      </div>

      <section className="student-workbench">
        <div>
          <span>Pages</span>
          <strong>{pages.length || '--'}</strong>
        </div>
        <div>
          <span>Chunks</span>
          <strong>{chunks.length || '--'}</strong>
        </div>
        <div>
          <span>Answer engine</span>
          <strong>{engine}</strong>
        </div>
        <div>
          <span>Retrieval</span>
          <strong>{retrievalEngine}</strong>
        </div>
      </section>

      <section className="study-strip">
        <div className="page-preview">
          <div>
            <strong>Easy scroll preview</strong>
            {toc.find((item) => item.page === selectedPage) ? (
              <button
                type="button"
                onClick={() =>
                  addBookmark(toc.find((item) => item.page === selectedPage)!)
                }
              >
                Bookmark
              </button>
            ) : null}
          </div>
          <p>
            {pagePreview ||
              'Upload a PDF, then choose a page from the table of contents.'}
          </p>
        </div>
        <div className="bookmark-board">
          <strong>Important bookmarks</strong>
          {bookmarks.length === 0 ? (
            <p>No bookmarks yet.</p>
          ) : (
            bookmarks.map((bookmark) => (
              <button
                key={bookmark.id}
                type="button"
                onClick={() => setSelectedPage(bookmark.page)}
              >
                Page {bookmark.page}: {bookmark.title}
              </button>
            ))
          )}
        </div>
      </section>

      {chunks.length > 0 ? (
        <div className="sample-question-row">
          {sampleQuestions.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => void answerQuestion(sample)}
              disabled={state !== 'ready'}
            >
              {sample}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
};

const LearningPanel = ({
  tab,
  pack,
  pagePreview,
}: {
  tab: LearningTab;
  pack: ReturnType<typeof makeLearningPack>;
  pagePreview: string;
}) => {
  if (tab === 'summary') {
    return (
      <PanelList
        title="Simple summary"
        items={pack.summary}
        empty="Upload a PDF to create a summary."
      />
    );
  }
  if (tab === 'notes') {
    return (
      <PanelList
        title="Important notes"
        items={pack.notes}
        empty="Upload a PDF to create important notes."
      />
    );
  }
  if (tab === 'flashcards') {
    return (
      <div className="learning-panel">
        <h2>Flashcards</h2>
        <div className="card-grid">
          {pack.flashcards.map((card) => (
            <article key={card.question} className="study-card">
              <strong>{card.question}</strong>
              <p>{card.answer}</p>
            </article>
          ))}
        </div>
      </div>
    );
  }
  if (tab === 'words') {
    return (
      <div className="learning-panel">
        <h2>Word meanings</h2>
        <div className="word-grid">
          {pack.words.map((word) => (
            <article key={word.word}>
              <strong>{word.word}</strong>
              <p>{word.meaning}</p>
            </article>
          ))}
        </div>
      </div>
    );
  }
  if (tab === 'quiz') {
    return (
      <div className="learning-panel">
        <h2>Playful questions</h2>
        {pack.quiz.map((item) => (
          <details key={item.question}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    );
  }
  return (
    <PanelList
      title="Page preview"
      items={[pagePreview]}
      empty="Choose a page to preview."
    />
  );
};

const PanelList = ({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) => (
  <div className="learning-panel">
    <h2>{title}</h2>
    {items.length === 0 ? (
      <p>{empty}</p>
    ) : (
      items.map((item) => <p key={item}>{item}</p>)
    )}
  </div>
);
