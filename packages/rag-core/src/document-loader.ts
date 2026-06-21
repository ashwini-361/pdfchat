import type { SupportedDocumentType } from '@doc-chat/shared';

import type { ParsedDocument, ParsedPage } from './types';

export interface DocumentLoadInput {
  documentId: string;
  fileName: string;
  contentType?: string;
  buffer: Buffer;
}

export interface LoadedDocument extends ParsedDocument {
  parser: SupportedDocumentType;
}

const extensionFor = (fileName: string) => {
  const [, ...parts] = fileName.toLowerCase().split('.');
  return parts.length ? parts.at(-1) ?? '' : '';
};

export const detectDocumentType = (
  fileName: string,
  contentType = '',
): SupportedDocumentType | null => {
  const normalizedContentType = contentType.toLowerCase();
  const extension = extensionFor(fileName);

  if (normalizedContentType.includes('pdf') || extension === 'pdf') {
    return 'pdf';
  }

  if (
    normalizedContentType.includes('wordprocessingml') ||
    normalizedContentType.includes('msword') ||
    extension === 'docx'
  ) {
    return 'docx';
  }

  if (extension === 'md' || extension === 'markdown') {
    return 'markdown';
  }

  if (normalizedContentType.includes('html') || ['html', 'htm'].includes(extension)) {
    return 'html';
  }

  if (normalizedContentType.includes('json') || extension === 'json') {
    return 'json';
  }

  if (normalizedContentType.includes('csv') || extension === 'csv') {
    return 'csv';
  }

  if (extension === 'tsv') {
    return 'tsv';
  }

  if (normalizedContentType.includes('rtf') || extension === 'rtf') {
    return 'rtf';
  }

  if (extension === 'log') {
    return 'log';
  }

  if (
    normalizedContentType.startsWith('text/') ||
    ['txt', 'text'].includes(extension)
  ) {
    return 'plain-text';
  }

  return null;
};

export const getSupportedDocumentSummary = () => [
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
];

export const loadDocument = async (
  input: DocumentLoadInput,
): Promise<LoadedDocument> => {
  const parser = detectDocumentType(input.fileName, input.contentType);

  if (!parser) {
    throw new Error(
      `Unsupported document format for ${input.fileName}. Supported formats: ${getSupportedDocumentSummary().join(
        ', ',
      )}.`,
    );
  }

  const pages = await parsePages(parser, input.buffer);

  return {
    documentId: input.documentId,
    title: input.fileName,
    parser,
    pages,
  };
};

const parsePages = async (
  parser: SupportedDocumentType,
  buffer: Buffer,
): Promise<ParsedPage[]> => {
  if (parser === 'pdf') {
    const pdfParse = (await import('pdf-parse')).default;
    const result = await pdfParse(buffer);

    return splitLongText(result.text, 3500);
  }

  if (parser === 'docx') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });

    return splitLongText(result.value, 3500);
  }

  const text = buffer.toString('utf8');

  if (parser === 'html') {
    const { htmlToText } = await import('html-to-text');
    return splitLongText(
      htmlToText(text, {
        wordwrap: false,
        selectors: [
          { selector: 'a', options: { ignoreHref: true } },
          { selector: 'img', format: 'skip' },
        ],
      }),
      3500,
    );
  }

  if (parser === 'json') {
    return splitLongText(jsonToReadableText(text), 3500);
  }

  if (parser === 'csv' || parser === 'tsv') {
    return splitLongText(delimitedTextToReadableText(text, parser === 'tsv' ? '\t' : ','), 3500);
  }

  if (parser === 'rtf') {
    return splitLongText(rtfToReadableText(text), 3500);
  }

  return splitLongText(text, 3500);
};

const splitLongText = (text: string, targetChars: number): ParsedPage[] => {
  const cleaned = normalizeWhitespace(text);
  const pages: ParsedPage[] = [];

  for (let cursor = 0; cursor < cleaned.length; cursor += targetChars) {
    const slice = cleaned.slice(cursor, cursor + targetChars).trim();
    if (slice) {
      pages.push({
        pageNumber: pages.length + 1,
        text: slice,
      });
    }
  }

  return pages.length
    ? pages
    : [
        {
          pageNumber: 1,
          text: '',
        },
      ];
};

const normalizeWhitespace = (text: string) =>
  text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ \f\v]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const jsonToReadableText = (text: string) => {
  try {
    return flattenJson(JSON.parse(text)).join('\n');
  } catch {
    return text;
  }
};

const flattenJson = (value: unknown, prefix = ''): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flattenJson(item, `${prefix}[${index}]`));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) =>
      flattenJson(item, prefix ? `${prefix}.${key}` : key),
    );
  }

  return [`${prefix}: ${String(value)}`];
};

const delimitedTextToReadableText = (text: string, delimiter: string) =>
  text
    .split(/\r?\n/)
    .map((line) =>
      line
        .split(delimiter)
        .map((cell) => cell.trim())
        .filter(Boolean)
        .join(' | '),
    )
    .join('\n');

const rtfToReadableText = (text: string) =>
  text
    .replace(/\\par[d]?/g, '\n')
    .replace(/\\'[0-9a-fA-F]{2}/g, ' ')
    .replace(/\\[a-z]+\d* ?/g, ' ')
    .replace(/[{}]/g, ' ');
