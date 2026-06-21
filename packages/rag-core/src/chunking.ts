import type { ChunkRecord, ParsedDocument } from './types';

export interface ChunkingOptions {
  targetChars?: number;
  overlapChars?: number;
}

const estimateTokens = (text: string) => Math.ceil(text.length / 4);

export const chunkDocument = (
  document: ParsedDocument,
  options: ChunkingOptions = {},
): ChunkRecord[] => {
  const targetChars = options.targetChars ?? 1800;
  const overlapChars = options.overlapChars ?? 200;
  const chunks: ChunkRecord[] = [];

  for (const page of document.pages) {
    const text = page.text.trim();
    if (!text) {
      continue;
    }

    let cursor = 0;
    let chunkIndex = 0;

    while (cursor < text.length) {
      const end = Math.min(text.length, cursor + targetChars);
      const slice = text.slice(cursor, end).trim();

      if (slice) {
        chunks.push({
          chunkId: `${document.documentId}-p${page.pageNumber}-c${chunkIndex}`,
          documentId: document.documentId,
          pageNumber: page.pageNumber,
          text: slice,
          tokenEstimate: estimateTokens(slice),
        });
      }

      if (end >= text.length) {
        break;
      }

      cursor = Math.max(end - overlapChars, cursor + 1);
      chunkIndex += 1;
    }
  }

  return chunks;
};

