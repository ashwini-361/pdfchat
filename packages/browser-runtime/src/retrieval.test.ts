import { describe, expect, it } from 'vitest';

import {
  createBrowserDocumentChunks,
  createVectorEntries,
  expandBrowserQueryTerms,
  expandRetrievedChunks,
  extractiveBrowserAnswer,
  searchTerms,
  searchVectorEntries,
  splitBrowserSentences,
  tokenizeBrowserText,
} from './retrieval';

describe('browser retrieval helpers', () => {
  it('tokenizes searchable terms without common stop words', () => {
    expect(tokenizeBrowserText('Where does the browser model run?')).toEqual([
      'does',
      'browser',
      'model',
      'run',
    ]);
  });

  it('keeps useful short acronyms and expands study abbreviations', () => {
    expect(tokenizeBrowserText('what is ml')).toEqual(['ml']);
    expect([...expandBrowserQueryTerms(['ml'])]).toEqual([
      'ml',
      'machine',
      'learning',
    ]);
  });

  it('splits text into deterministic page chunks', () => {
    const chunks = createBrowserDocumentChunks(
      [
        {
          page: 1,
          text: 'Browser WebGPU runs local models. Ollama is optional.',
        },
        {
          page: 2,
          text: 'Extractive fallback answers from matching PDF sentences.',
        },
      ],
      5,
    );

    expect(chunks.map((chunk) => chunk.id)).toEqual([
      'p1-c1',
      'p1-c2',
      'p2-c3',
    ]);
    expect(chunks.map((chunk) => chunk.page)).toEqual([1, 1, 2]);
    expect(chunks[0]?.terms.get('browser')).toBe(1);
  });

  it('searches by local terms and respects similarity thresholds', () => {
    const chunks = createBrowserDocumentChunks([
      {
        page: 1,
        text: 'Browser WebGPU runs local models. Backend health checks Ollama.',
      },
    ]);

    expect(
      searchTerms('local browser model', chunks, {
        maxResults: 2,
        similarityThreshold: 10,
      }),
    ).toHaveLength(1);
    expect(
      searchTerms('local browser model', chunks, {
        maxResults: 2,
        similarityThreshold: 100,
      }),
    ).toHaveLength(0);
  });

  it('matches expanded acronyms against full document terms', () => {
    const chunks = createBrowserDocumentChunks([
      {
        page: 1,
        text: 'Machine Learning is a field where computer systems learn patterns from data.',
      },
    ]);

    const [match] = searchTerms('what is ml', chunks, {
      maxResults: 2,
      similarityThreshold: 60,
    });

    expect(match).toMatchObject({
      page: 1,
      score: 1,
    });
  });

  it('searches vector entries with cosine similarity', () => {
    const chunks = createBrowserDocumentChunks([
      { page: 1, text: 'Browser local WebLLM answer.' },
      { page: 2, text: 'Remote backend service answer.' },
    ]);
    const entries = createVectorEntries(chunks, [
      [1, 0],
      [0, 1],
    ]);

    const [match] = searchVectorEntries([1, 0], entries, {
      maxResults: 1,
      similarityThreshold: 80,
    });

    expect(match).toMatchObject({
      id: 'p1-c1',
      page: 1,
      score: 1,
    });
  });

  it('expands retrieved chunks only within the same page', () => {
    const chunks = createBrowserDocumentChunks(
      [
        { page: 1, text: 'One. Two. Three.' },
        { page: 2, text: 'Four. Five.' },
      ],
      1,
    );
    const selected = expandRetrievedChunks(
      [{ ...chunks[1]!, score: 0.8 }],
      chunks,
      2,
    );

    expect(selected.map((chunk) => chunk.id)).toEqual([
      'p1-c1',
      'p1-c2',
      'p1-c3',
    ]);
  });

  it('creates an extractive answer from retrieved PDF sentences', () => {
    const chunks = createBrowserDocumentChunks([
      {
        page: 4,
        text: 'Browser offline mode keeps the answer local to the device. Ollama can still be used as an optional backend service.',
      },
    ]);
    const answer = extractiveBrowserAnswer('Where does offline mode run?', [
      { ...chunks[0]!, score: 0.8 },
    ]);

    expect(answer).toContain('Browser offline mode');
    expect(answer).toContain('(page 4)');
  });

  it('returns a helpful message when no source text is available', () => {
    expect(extractiveBrowserAnswer('missing?', [])).toContain(
      'could not find enough matching text',
    );
  });

  it('keeps sentence splitting stable for compact fallback answers', () => {
    expect(splitBrowserSentences('First sentence. Second sentence?')).toEqual([
      'First sentence.',
      'Second sentence?',
    ]);
  });
});
