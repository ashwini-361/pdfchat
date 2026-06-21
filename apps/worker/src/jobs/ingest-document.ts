import { chunkDocument, loadDocument, MockEmbeddingProvider } from '@doc-chat/rag-core';

export const createDemoIngestionReport = async () => {
  const provider = new MockEmbeddingProvider();
  const parsedDocument = await loadDocument({
    documentId: 'demo-worker-document',
    fileName: 'demo-worker-document.md',
    contentType: 'text/markdown',
    buffer: Buffer.from(`# Ingestion demo
Workers should own parsing, chunking, embedding, and indexing so the API stays responsive.

This monorepo supports PDF, DOCX, Markdown, TXT, HTML, JSON, CSV, TSV, RTF, and log-like text files.`),
  });

  const chunks = chunkDocument(parsedDocument);
  const vectors = await provider.embedTexts(chunks.map((chunk) => chunk.text));

  return {
    documentId: parsedDocument.documentId,
    chunks: chunks.length,
    vectorDimension: vectors[0]?.length ?? 0,
    parser: parsedDocument.parser,
    embeddingProvider: provider.id,
  };
};
