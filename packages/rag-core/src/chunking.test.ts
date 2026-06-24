import { describe, expect, it } from 'vitest';

import { chunkDocument } from './chunking';

describe('chunkDocument', () => {
  it('skips empty pages and creates stable chunk metadata', () => {
    const chunks = chunkDocument(
      {
        documentId: 'doc-1',
        pages: [
          { pageNumber: 1, text: '   ' },
          { pageNumber: 2, text: 'abcdefghij' },
        ],
      },
      { targetChars: 5, overlapChars: 2 },
    );

    expect(chunks).toEqual([
      {
        chunkId: 'doc-1-p2-c0',
        documentId: 'doc-1',
        pageNumber: 2,
        text: 'abcde',
        tokenEstimate: 2,
      },
      {
        chunkId: 'doc-1-p2-c1',
        documentId: 'doc-1',
        pageNumber: 2,
        text: 'defgh',
        tokenEstimate: 2,
      },
      {
        chunkId: 'doc-1-p2-c2',
        documentId: 'doc-1',
        pageNumber: 2,
        text: 'ghij',
        tokenEstimate: 1,
      },
    ]);
  });

  it('moves forward even when overlap is larger than the target size', () => {
    const chunks = chunkDocument(
      {
        documentId: 'doc-2',
        pages: [{ pageNumber: 1, text: 'abcdef' }],
      },
      { targetChars: 2, overlapChars: 10 },
    );

    expect(chunks.map((chunk) => chunk.text)).toEqual([
      'ab',
      'bc',
      'cd',
      'de',
      'ef',
    ]);
  });
});
