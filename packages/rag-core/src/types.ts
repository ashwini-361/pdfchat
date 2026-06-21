import type { SourceCitation } from '@doc-chat/shared';

export interface ParsedPage {
  pageNumber: number;
  text: string;
}

export interface ParsedDocument {
  documentId: string;
  title?: string;
  parser?: string;
  pages: ParsedPage[];
}

export interface ChunkRecord {
  chunkId: string;
  documentId: string;
  pageNumber: number;
  text: string;
  tokenEstimate: number;
}

export interface RetrievalResult {
  chunk: ChunkRecord;
  score: number;
}

export interface EmbeddingProvider {
  id: string;
  embedTexts(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

export interface ChatProvider {
  id: string;
  generateAnswer(input: {
    question: string;
    contextChunks: ChunkRecord[];
  }): Promise<{ answer: string; model: string }>;
}

export interface VectorStore {
  upsert(chunks: ChunkRecord[], vectors: number[][]): Promise<void>;
  search(queryVector: number[], options: SearchOptions): Promise<RetrievalResult[]>;
}

export interface SearchOptions {
  documentId: string;
  topK: number;
}

export interface GroundedAnswer {
  answer: string;
  citations: SourceCitation[];
  model: string;
  grounded: boolean;
}
