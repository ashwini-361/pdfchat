'use client';

import { useMemo, useRef, useState } from 'react';

type ProcessingState = 'idle' | 'reading' | 'ready' | 'answering' | 'error';
type LearningTab = 'chat' | 'summary' | 'flashcards' | 'notes' | 'words' | 'quiz';
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

type PdfPage = {
  page: number;
  text: string;
};

type PdfChunk = {
  id: string;
  page: number;
  text: string;
  terms: Map<string, number>;
};

type RetrievedChunk = PdfChunk & {
  score: number;
};

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

type ChromeLanguageModel = {
  availability: () => Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>;
  create: () => Promise<{
    prompt: (messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>) => Promise<string>;
  }>;
};

type PromptMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

declare global {
  interface Window {
    LanguageModel?: ChromeLanguageModel;
  }
}

const providerPresets: ProviderPreset[] = [
  {
    id: 'browser',
    label: 'Browser local',
    baseUrl: '',
    model: 'Prompt API or local retrieval',
    needsKey: false,
    note: 'Uses Chrome built-in Prompt API when available, then local grounded retrieval.',
  },
  {
    id: 'ollama',
    label: 'Ollama',
    baseUrl: 'http://localhost:11434/v1',
    model: 'gemma3:4b',
    needsKey: false,
    note: 'Run Ollama locally and expose its OpenAI-compatible endpoint.',
  },
  {
    id: 'vllm',
    label: 'vLLM',
    baseUrl: 'http://localhost:8000/v1',
    model: 'meta-llama/Llama-3.1-8B-Instruct',
    needsKey: false,
    note: 'Works with local or server vLLM OpenAI-compatible serving.',
  },
  {
    id: 'llamacpp',
    label: 'llama.cpp',
    baseUrl: 'http://localhost:8080/v1',
    model: 'local-model',
    needsKey: false,
    note: 'Use llama-server with OpenAI-compatible chat completions.',
  },
  {
    id: 'lemonade',
    label: 'Lemonade',
    baseUrl: 'http://localhost:8000/v1',
    model: 'llama',
    needsKey: false,
    note: 'Point this to your Lemonade OpenAI-compatible local server.',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'google/gemma-3-4b-it',
    needsKey: true,
    note: 'Bring your OpenRouter key for hosted open models.',
  },
  {
    id: 'nvidia',
    label: 'NVIDIA',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    model: 'nvidia/llama-3.1-nemotron-nano-8b-v1',
    needsKey: true,
    note: 'Uses NVIDIA NIM OpenAI-compatible chat completions.',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4.1-mini',
    needsKey: true,
    note: 'Bring your OpenAI API key for stronger hosted answers.',
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

const stopWords = new Set([
  'about',
  'after',
  'also',
  'and',
  'are',
  'because',
  'between',
  'from',
  'have',
  'into',
  'that',
  'their',
  'there',
  'these',
  'this',
  'through',
  'using',
  'were',
  'what',
  'when',
  'where',
  'which',
  'with',
  'would',
]);

const sampleQuestions = [
  'Explain this like I am in class 8.',
  'What are the 5 most important exam points?',
  'Make a funny quiz from this PDF.',
  'What difficult words should I learn?',
];

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((term) => term.length > 2 && !stopWords.has(term));

const termMap = (text: string) => {
  const counts = new Map<string, number>();
  for (const term of tokenize(text)) {
    counts.set(term, (counts.get(term) ?? 0) + 1);
  }
  return counts;
};

const sentenceList = (text: string) =>
  text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const splitIntoChunks = (pages: PdfPage[]) => {
  const chunks: PdfChunk[] = [];

  for (const page of pages) {
    let buffer: string[] = [];
    let wordCount = 0;

    for (const sentence of sentenceList(page.text)) {
      const sentenceWords = sentence.split(/\s+/).length;
      if (wordCount + sentenceWords > 150 && buffer.length > 0) {
        const text = buffer.join(' ').trim();
        chunks.push({ id: `p${page.page}-c${chunks.length + 1}`, page: page.page, text, terms: termMap(text) });
        buffer = [];
        wordCount = 0;
      }

      buffer.push(sentence);
      wordCount += sentenceWords;
    }

    if (buffer.length > 0) {
      const text = buffer.join(' ').trim();
      chunks.push({ id: `p${page.page}-c${chunks.length + 1}`, page: page.page, text, terms: termMap(text) });
    }
  }

  return chunks;
};

const retrieveChunks = (question: string, chunks: PdfChunk[], limit = 5) => {
  const uniqueTerms = new Set(tokenize(question));

  // The in-memory index keeps the free demo useful without embeddings or a backend.
  return chunks
    .map((chunk) => {
      let score = 0;
      for (const term of uniqueTerms) {
        const frequency = chunk.terms.get(term) ?? 0;
        if (frequency > 0) {
          score += 1 + Math.log(frequency + 1);
        }
      }

      return { ...chunk, score };
    })
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

const bestSentences = (text: string, query = '', limit = 5) => {
  const queryTerms = new Set(tokenize(query));
  return sentenceList(text)
    .filter((sentence) => sentence.length > 35)
    .map((sentence) => ({
      sentence,
      score:
        tokenize(sentence).reduce((total, term) => total + (queryTerms.has(term) ? 2 : 0), 0) +
        Math.min(sentence.length / 180, 2),
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
      sentenceList(page.text)[0] ??
      `Page ${page.page}`;
    toc.push({ id: `toc-${page.page}`, page: page.page, title: title.slice(0, 80) });
  }
  return toc.slice(0, 18);
};

const extractiveAnswer = (question: string, sources: RetrievedChunk[]) => {
  if (sources.length === 0) {
    return 'I could not find enough matching text in the PDF. Try using words that appear in the document.';
  }

  const answerBody = sources
    .flatMap((source) => bestSentences(source.text, question, 2).map((sentence) => `${sentence} (page ${source.page})`))
    .slice(0, 4)
    .join(' ');

  return `Based on the PDF, ${answerBody}`;
};

const buildPrompt = (question: string, sources: RetrievedChunk[]): PromptMessage[] => {
  const context = sources.map((source) => `[page ${source.page}] ${source.text}`).join('\n\n');
  return [
    {
      role: 'system',
      content:
        'You are a playful tutor for students under class 10. Answer only from the PDF context. Use simple words, short sections, page citations, and a friendly tone. If the context is missing, say you cannot find it in the PDF.',
    },
    {
      role: 'user',
      content: `PDF context:\n${context}\n\nQuestion: ${question}`,
    },
  ];
};

const askBuiltInPrompt = async (question: string, sources: RetrievedChunk[]) => {
  const languageModel = window.LanguageModel;
  if (!languageModel) {
    return null;
  }

  const availability = await languageModel.availability();
  if (availability === 'unavailable') {
    return null;
  }

  const session = await languageModel.create();
  return session.prompt(buildPrompt(question, sources));
};

const askOpenAiCompatible = async (
  provider: ProviderPreset,
  apiKey: string,
  question: string,
  sources: RetrievedChunk[],
) => {
  if (!provider.baseUrl) {
    return null;
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey.trim()) {
    headers.Authorization = `Bearer ${apiKey.trim()}`;
  }
  if (provider.id === 'openrouter') {
    headers['HTTP-Referer'] = 'http://localhost:3000';
    headers['X-Title'] = 'Ask my PDF student demo';
  }

  const response = await fetch(`${provider.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: provider.model,
      messages: buildPrompt(question, sources),
      temperature: 0.25,
      max_tokens: 700,
    }),
  });

  if (!response.ok) {
    throw new Error(`Model API returned ${response.status}. Check CORS, base URL, model name, or API key.`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return payload.choices?.[0]?.message?.content ?? null;
};

const makeLearningPack = (pages: PdfPage[], chunks: PdfChunk[]) => {
  const fullText = pages.map((page) => page.text).join(' ');
  const important = bestSentences(fullText, 'important main explain remember', 7);
  const terms = [...chunks.reduce((map, chunk) => {
    for (const [term, count] of chunk.terms) {
      map.set(term, (map.get(term) ?? 0) + count);
    }
    return map;
  }, new Map<string, number>())]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([term]) => term);

  return {
    summary: important.slice(0, 4),
    notes: important.map((sentence, index) => `Point ${index + 1}: ${sentence}`),
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
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [statusMessage, setStatusMessage] = useState('Add a PDF to begin.');
  const [engine, setEngine] = useState('Waiting for PDF');
  const [providerId, setProviderId] = useState<ProviderId>('browser');
  const [apiKey, setApiKey] = useState('');
  const [customBaseUrl, setCustomBaseUrl] = useState(providerPresets.at(-1)?.baseUrl ?? '');
  const [customModel, setCustomModel] = useState(providerPresets.at(-1)?.model ?? '');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<TocItem[]>([]);
  const [selectedPage, setSelectedPage] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedPreset = providerPresets.find((provider) => provider.id === providerId) ?? providerPresets[0];
  const activeProvider =
    providerId === 'custom'
      ? { ...selectedPreset, baseUrl: customBaseUrl, model: customModel }
      : selectedPreset;
  const canAsk = state === 'ready' && question.trim().length > 0;
  const toc = useMemo(() => generateToc(pages), [pages]);
  const learningPack = useMemo(() => makeLearningPack(pages, chunks), [pages, chunks]);
  const hasWebGpu = typeof navigator !== 'undefined' && 'gpu' in navigator;
  const pagePreview = pages.find((page) => page.page === selectedPage)?.text ?? '';

  const readPdf = async (file: File) => {
    setState('reading');
    setFileName(file.name);
    setMessages([]);
    setChunks([]);
    setPages([]);
    setBookmarks([]);
    setSelectedPage(1);
    setEngine('PDF.js local parser');
    setStatusMessage('Reading PDF text in this browser...');

    try {
      // PDF.js touches browser-only APIs, so import it after user interaction.
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString();
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

      const nextChunks = splitIntoChunks(nextPages);
      setPages(nextPages);
      setChunks(nextChunks);
      setState('ready');
      setStatusMessage(`Ready. Indexed ${nextChunks.length} chunks from ${pdf.numPages} pages.`);
    } catch (error) {
      setState('error');
      setStatusMessage(error instanceof Error ? error.message : 'Could not read this PDF.');
    }
  };

  const answerQuestion = async (questionText = question) => {
    if (state !== 'ready' || questionText.trim().length === 0) {
      return;
    }

    const cleanQuestion = questionText.trim();
    const sources = retrieveChunks(cleanQuestion, chunks);
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', content: cleanQuestion }]);
    setQuestion('');
    setState('answering');
    setStatusMessage('Retrieving matching PDF chunks...');

    try {
      let answer: string | null = null;
      if (activeProvider.id === 'browser') {
        setStatusMessage('Trying browser built-in prompt, then local fallback...');
        answer = await askBuiltInPrompt(cleanQuestion, sources);
      } else {
        setStatusMessage(`Asking ${activeProvider.label} with grounded PDF context...`);
        answer = await askOpenAiCompatible(activeProvider, apiKey, cleanQuestion, sources);
      }

      setEngine(answer ? activeProvider.label : 'Local extractive answer');
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: answer ?? extractiveAnswer(cleanQuestion, sources),
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
          content: `${extractiveAnswer(cleanQuestion, sources)}\n\nModel note: ${
            error instanceof Error ? error.message : 'Provider failed, so the free local mode answered.'
          }`,
          sources,
        },
      ]);
      setStatusMessage('Provider failed, so free local retrieval answered instead.');
    } finally {
      setState('ready');
    }
  };

  const addBookmark = (item: TocItem) => {
    setBookmarks((current) => (current.some((bookmark) => bookmark.id === item.id) ? current : [...current, item]));
  };

  return (
    <section className="pdf-demo-shell" aria-label="Local PDF learning demo">
      <nav className="pdf-demo-nav">
        <button className="brand-button" type="button">Ask my PDF</button>
        <div className="nav-links" aria-label="Demo links">
          <button type="button" onClick={() => setActiveTab('summary')}>Summary</button>
          <button type="button" onClick={() => setActiveTab('flashcards')}>Flashcards</button>
          <button type="button" onClick={() => setSettingsOpen((open) => !open)}>Settings</button>
        </div>
      </nav>

      {settingsOpen ? (
        <section className="settings-dock" aria-label="Model provider settings">
          <div>
            <span>Answer provider</span>
            <select value={providerId} onChange={(event) => setProviderId(event.target.value as ProviderId)}>
              {providerPresets.map((provider) => (
                <option key={provider.id} value={provider.id}>{provider.label}</option>
              ))}
            </select>
            <p>{activeProvider.note}</p>
          </div>
          <label>
            Base URL
            <input
              value={providerId === 'custom' ? customBaseUrl : activeProvider.baseUrl}
              disabled={providerId !== 'custom'}
              onChange={(event) => setCustomBaseUrl(event.target.value)}
            />
          </label>
          <label>
            Model
            <input
              value={providerId === 'custom' ? customModel : activeProvider.model}
              disabled={providerId !== 'custom'}
              onChange={(event) => setCustomModel(event.target.value)}
            />
          </label>
          <label>
            API key
            <input
              type="password"
              value={apiKey}
              placeholder={activeProvider.needsKey ? 'Required for this provider' : 'Optional for local servers'}
              onChange={(event) => setApiKey(event.target.value)}
            />
          </label>
          <div className="runtime-pills">
            <span>{hasWebGpu ? 'WebGPU available' : 'WebGPU not detected'}</span>
            <span>Free mode always works offline after PDF parsing</span>
          </div>
        </section>
      ) : null}

      <div className="pdf-demo-grid">
        <aside className="pdf-drop-panel" onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (file?.type === 'application/pdf') void readPdf(file);
        }}>
          <input ref={inputRef} className="hidden-input" type="file" accept="application/pdf" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void readPdf(file);
          }} />
          <button className="read-pdf-button" type="button" onClick={() => inputRef.current?.click()}>
            <span aria-hidden="true">PDF</span>
            Read PDF
          </button>
          <div className="reader-note">
            <p>Drop a selectable-text PDF. It is parsed, chunked, searched, and previewed locally in the browser.</p>
          </div>
          <div className="pdf-status-board">
            <span>{state.toUpperCase()}</span>
            <strong>{statusMessage}</strong>
            {fileName ? <p>{fileName}</p> : null}
          </div>
          <div className="toc-panel">
            <strong>Table of contents</strong>
            {toc.length === 0 ? <p>Add a PDF to generate a simple page map.</p> : toc.map((item) => (
              <button key={item.id} type="button" onClick={() => setSelectedPage(item.page)}>
                <span>p{item.page}</span>
                {item.title}
              </button>
            ))}
          </div>
        </aside>

        <section className="pdf-chat-panel">
          <div className="learning-tabs">
            {(['chat', 'summary', 'flashcards', 'notes', 'words', 'quiz'] as LearningTab[]).map((tab) => (
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
                  <div className="empty-chat"><p>Please add a document for which you have questions.</p></div>
                ) : messages.map((message) => (
                  <article className={`chat-bubble chat-bubble-${message.role}`} key={message.id}>
                    <p>{message.content}</p>
                    {message.sources ? (
                      <div className="source-list">
                        <strong>Sources</strong>
                        {message.sources.map((source) => (
                          <span key={source.id}>Page {source.page}: {source.text.slice(0, 130)}...</span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
              <form className="question-form" onSubmit={(event) => {
                event.preventDefault();
                void answerQuestion();
              }}>
                <textarea
                  value={question}
                  disabled={state !== 'ready'}
                  placeholder={state === 'ready' ? 'Ask like: explain this concept with an example' : 'Upload a PDF first'}
                  onChange={(event) => setQuestion(event.target.value)}
                />
                <button type="submit" disabled={!canAsk}>{state === 'answering' ? 'Thinking' : "Let's go"}</button>
              </form>
            </>
          ) : (
            <LearningPanel tab={activeTab} pack={learningPack} pagePreview={pagePreview} />
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
          <span>Selected page</span>
          <strong>Page {selectedPage}</strong>
        </div>
      </section>

      <section className="study-strip">
        <div className="page-preview">
          <div>
            <strong>Easy scroll preview</strong>
            {toc.find((item) => item.page === selectedPage) ? (
              <button type="button" onClick={() => addBookmark(toc.find((item) => item.page === selectedPage)!)}>Bookmark</button>
            ) : null}
          </div>
          <p>{pagePreview || 'Upload a PDF, then choose a page from the table of contents.'}</p>
        </div>
        <div className="bookmark-board">
          <strong>Important bookmarks</strong>
          {bookmarks.length === 0 ? <p>No bookmarks yet.</p> : bookmarks.map((bookmark) => (
            <button key={bookmark.id} type="button" onClick={() => setSelectedPage(bookmark.page)}>
              Page {bookmark.page}: {bookmark.title}
            </button>
          ))}
        </div>
      </section>

      {chunks.length > 0 ? (
        <div className="sample-question-row">
          {sampleQuestions.map((sample) => (
            <button key={sample} type="button" onClick={() => void answerQuestion(sample)} disabled={state !== 'ready'}>
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
    return <PanelList title="Simple summary" items={pack.summary} empty="Upload a PDF to create a summary." />;
  }
  if (tab === 'notes') {
    return <PanelList title="Important notes" items={pack.notes} empty="Upload a PDF to create important notes." />;
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
  return <PanelList title="Page preview" items={[pagePreview]} empty="Choose a page to preview." />;
};

const PanelList = ({ title, items, empty }: { title: string; items: string[]; empty: string }) => (
  <div className="learning-panel">
    <h2>{title}</h2>
    {items.length === 0 ? <p>{empty}</p> : items.map((item) => <p key={item}>{item}</p>)}
  </div>
);
