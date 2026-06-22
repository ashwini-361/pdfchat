'use client';

import { useMemo, useRef, useState } from 'react';

type ProcessingState = 'idle' | 'reading' | 'ready' | 'answering' | 'error';

type PdfChunk = {
  id: string;
  page: number;
  text: string;
  terms: Map<string, number>;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: RetrievedChunk[];
};

type RetrievedChunk = PdfChunk & {
  score: number;
};

type ChromeLanguageModel = {
  availability: () => Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>;
  create: (options?: {
    monitor?: (monitor: EventTarget) => void;
  }) => Promise<{
    prompt: (messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>) => Promise<string>;
  }>;
};

declare global {
  interface Window {
    LanguageModel?: ChromeLanguageModel;
  }
}

const stopWords = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'has',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'that',
  'the',
  'this',
  'to',
  'was',
  'with',
]);

const sampleQuestions = [
  'What is this PDF mainly about?',
  'Summarize the key points in simple language.',
  'Which facts should I remember for an exam?',
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

const splitIntoChunks = (pages: Array<{ page: number; text: string }>) => {
  const chunks: PdfChunk[] = [];

  for (const page of pages) {
    const sentences = page.text
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean);

    let buffer: string[] = [];
    let wordCount = 0;

    for (const sentence of sentences) {
      const sentenceWords = sentence.split(/\s+/).length;
      if (wordCount + sentenceWords > 150 && buffer.length > 0) {
        const text = buffer.join(' ').trim();
        chunks.push({
          id: `p${page.page}-c${chunks.length + 1}`,
          page: page.page,
          text,
          terms: termMap(text),
        });
        buffer = [];
        wordCount = 0;
      }

      buffer.push(sentence);
      wordCount += sentenceWords;
    }

    if (buffer.length > 0) {
      const text = buffer.join(' ').trim();
      chunks.push({
        id: `p${page.page}-c${chunks.length + 1}`,
        page: page.page,
        text,
        terms: termMap(text),
      });
    }
  }

  return chunks;
};

const retrieveChunks = (question: string, chunks: PdfChunk[]) => {
  const queryTerms = tokenize(question);
  const uniqueTerms = new Set(queryTerms);

  // A compact in-memory scorer is enough for the demo: exact term overlap gets
  // a small frequency boost, then the top chunks become the answer context.
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
    .slice(0, 4);
};

const extractiveAnswer = (question: string, sources: RetrievedChunk[]) => {
  if (sources.length === 0) {
    return 'I could not find enough matching text in the PDF to answer that. Try asking with words that appear in the document.';
  }

  const queryTerms = new Set(tokenize(question));
  const rankedSentences = sources
    .flatMap((source) =>
      source.text
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => ({
          sentence,
          page: source.page,
          score: tokenize(sentence).reduce(
            (total, term) => total + (queryTerms.has(term) ? 1 : 0),
            0,
          ),
        })),
    )
    .filter((item) => item.sentence.length > 40)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const answerBody =
    rankedSentences.length > 0
      ? rankedSentences
          .map((item) => `${item.sentence.trim()} (page ${item.page})`)
          .join(' ')
      : `${sources[0].text.slice(0, 520).trim()}... (page ${sources[0].page})`;

  return `Based on the PDF, ${answerBody}`;
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
  const context = sources
    .map((source) => `[page ${source.page}] ${source.text}`)
    .join('\n\n');

  // Chrome's Prompt API keeps generation on-device when Gemini Nano is available.
  return session.prompt([
    {
      role: 'system',
      content:
        'Answer only from the supplied PDF context. If the context is not enough, say you cannot find it in the document. Cite page numbers inline.',
    },
    {
      role: 'user',
      content: `PDF context:\n${context}\n\nQuestion: ${question}`,
    },
  ]);
};

export const LocalPdfChat = () => {
  const [state, setState] = useState<ProcessingState>('idle');
  const [fileName, setFileName] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [chunks, setChunks] = useState<PdfChunk[]>([]);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [statusMessage, setStatusMessage] = useState('Add a PDF to begin.');
  const [engine, setEngine] = useState('Waiting for PDF');
  const inputRef = useRef<HTMLInputElement>(null);

  const canAsk = state === 'ready' && question.trim().length > 0;
  const topTerms = useMemo(() => {
    const counts = new Map<string, number>();
    for (const chunk of chunks) {
      for (const [term, count] of chunk.terms) {
        counts.set(term, (counts.get(term) ?? 0) + count);
      }
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([term]) => term);
  }, [chunks]);

  const readPdf = async (file: File) => {
    setState('reading');
    setFileName(file.name);
    setMessages([]);
    setChunks([]);
    setPageCount(0);
    setEngine('PDF.js local parser');
    setStatusMessage('Reading PDF text in this browser...');

    try {
      // PDF.js touches browser-only APIs, so import it after user interaction.
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/legacy/build/pdf.worker.mjs',
        import.meta.url,
      ).toString();
      const data = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data }).promise;
      const pages: Array<{ page: number; text: string }> = [];

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
          pages.push({ page: pageNumber, text });
        }
      }

      const nextChunks = splitIntoChunks(pages);
      setPageCount(pdf.numPages);
      setChunks(nextChunks);
      setState('ready');
      setStatusMessage(
        `Ready. Indexed ${nextChunks.length} chunks from ${pdf.numPages} pages.`,
      );
    } catch (error) {
      setState('error');
      setStatusMessage(
        error instanceof Error ? error.message : 'Could not read this PDF.',
      );
    }
  };

  const answerQuestion = async (questionText = question) => {
    if (state !== 'ready' || questionText.trim().length === 0) {
      return;
    }

    const cleanQuestion = questionText.trim();
    const sources = retrieveChunks(cleanQuestion, chunks);
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: cleanQuestion,
    };

    setMessages((current) => [...current, userMessage]);
    setQuestion('');
    setState('answering');
    setStatusMessage('Retrieving relevant chunks...');

    try {
      setStatusMessage('Trying browser built-in prompt...');
      const promptAnswer = await askBuiltInPrompt(cleanQuestion, sources);
      const answer = promptAnswer ?? extractiveAnswer(cleanQuestion, sources);

      setEngine(promptAnswer ? 'Chrome built-in Prompt API' : 'Local extractive answer');
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: answer,
          sources,
        },
      ]);
      setStatusMessage('Answer grounded in retrieved PDF chunks.');
      setState('ready');
    } catch {
      setEngine('Local extractive answer');
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: extractiveAnswer(cleanQuestion, sources),
          sources,
        },
      ]);
      setStatusMessage('Built-in prompt was not available, so local retrieval answered.');
      setState('ready');
    }
  };

  return (
    <section className="pdf-demo-shell" aria-label="Local PDF chat demo">
      <nav className="pdf-demo-nav">
        <button className="brand-button" type="button">
          Ask my PDF
        </button>
        <div className="nav-links" aria-label="Demo links">
          <a href="#how-it-works">About</a>
          <a href="#study-workflow">Study</a>
          <a href="https://github.com/ashwini-961/ask-my-pdf">GitHub</a>
          <button className="settings-button" type="button" title="Settings">
            *
          </button>
        </div>
      </nav>

      <div className="pdf-demo-grid">
        <div
          className="pdf-drop-panel"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files[0];
            if (file?.type === 'application/pdf') {
              void readPdf(file);
            }
          }}
        >
          <input
            ref={inputRef}
            className="hidden-input"
            type="file"
            accept="application/pdf"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void readPdf(file);
              }
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
              Works best with selectable text PDFs. Scanned image-only files need
              OCR before this browser demo can read them.
            </p>
          </div>

          <div className="pdf-status-board">
            <span>{state.toUpperCase()}</span>
            <strong>{statusMessage}</strong>
            {fileName ? <p>{fileName}</p> : null}
          </div>
        </div>

        <div className="pdf-chat-panel">
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
                          Page {source.page}: {source.text.slice(0, 120)}...
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
                  ? 'What do you want to know?'
                  : 'Upload a PDF first'
              }
              onChange={(event) => setQuestion(event.target.value)}
            />
            <button type="submit" disabled={!canAsk}>
              {state === 'answering' ? 'Thinking' : "Let's go"}
            </button>
          </form>
        </div>
      </div>

      <div className="pdf-demo-footer" id="how-it-works">
        <div>
          <span>Pages</span>
          <strong>{pageCount || '--'}</strong>
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
          <span>Top terms</span>
          <strong>{topTerms.length > 0 ? topTerms.join(', ') : '--'}</strong>
        </div>
      </div>

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
