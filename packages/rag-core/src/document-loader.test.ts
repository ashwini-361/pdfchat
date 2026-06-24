import { describe, expect, it } from 'vitest';

import {
  detectDocumentType,
  getSupportedDocumentSummary,
  loadDocument,
} from './document-loader';

describe('detectDocumentType', () => {
  it('detects supported formats by content type and extension', () => {
    expect(detectDocumentType('paper.pdf', 'application/octet-stream')).toBe(
      'pdf',
    );
    expect(
      detectDocumentType(
        'notes.bin',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    ).toBe('docx');
    expect(detectDocumentType('readme.md')).toBe('markdown');
    expect(detectDocumentType('index.html')).toBe('html');
    expect(detectDocumentType('data.json')).toBe('json');
    expect(detectDocumentType('table.csv')).toBe('csv');
    expect(detectDocumentType('table.tsv')).toBe('tsv');
    expect(detectDocumentType('copy.rtf')).toBe('rtf');
    expect(detectDocumentType('server.log')).toBe('log');
    expect(detectDocumentType('plain.txt')).toBe('plain-text');
  });

  it('returns null for unsupported formats', () => {
    expect(detectDocumentType('image.png', 'image/png')).toBeNull();
  });
});

describe('getSupportedDocumentSummary', () => {
  it('lists user-facing supported formats', () => {
    expect(getSupportedDocumentSummary()).toEqual([
      'PDF',
      'DOCX',
      'Markdown',
      'TXT',
      'HTML',
      'JSON',
      'CSV',
      'TSV',
      'RTF',
      'LOG',
    ]);
  });
});

describe('loadDocument', () => {
  it('loads plain text documents', async () => {
    const document = await loadDocument({
      documentId: 'doc-1',
      fileName: 'notes.txt',
      contentType: 'text/plain',
      buffer: Buffer.from('Hello\tclass\r\n\r\n\r\nThis is a note.'),
    });

    expect(document).toMatchObject({
      documentId: 'doc-1',
      title: 'notes.txt',
      parser: 'plain-text',
    });
    expect(document.pages).toEqual([
      {
        pageNumber: 1,
        text: 'Hello class\n\nThis is a note.',
      },
    ]);
  });

  it('loads JSON as readable flattened text', async () => {
    const document = await loadDocument({
      documentId: 'doc-2',
      fileName: 'data.json',
      buffer: Buffer.from(
        JSON.stringify({ title: 'RAG', items: [{ name: 'chunk' }] }),
      ),
    });

    expect(document.parser).toBe('json');
    expect(document.pages[0]?.text).toContain('title: RAG');
    expect(document.pages[0]?.text).toContain('items[0].name: chunk');
  });

  it('loads CSV and TSV as readable rows', async () => {
    const csv = await loadDocument({
      documentId: 'doc-3',
      fileName: 'marks.csv',
      buffer: Buffer.from('name,score\nAsha,10'),
    });
    const tsv = await loadDocument({
      documentId: 'doc-4',
      fileName: 'marks.tsv',
      buffer: Buffer.from('name\tscore\nAsha\t10'),
    });

    expect(csv.pages[0]?.text).toBe('name | score\nAsha | 10');
    expect(tsv.pages[0]?.text).toBe('name | score\nAsha | 10');
  });

  it('loads RTF-ish text into readable text', async () => {
    const document = await loadDocument({
      documentId: 'doc-5',
      fileName: 'memo.rtf',
      buffer: Buffer.from(String.raw`{\rtf1 Hello\par world}`),
    });

    expect(document.parser).toBe('rtf');
    expect(document.pages[0]?.text).toContain('Hello');
    expect(document.pages[0]?.text).toContain('world');
  });

  it('throws for unsupported files', async () => {
    await expect(
      loadDocument({
        documentId: 'doc-6',
        fileName: 'image.png',
        contentType: 'image/png',
        buffer: Buffer.from('nope'),
      }),
    ).rejects.toThrow('Unsupported document format');
  });
});
