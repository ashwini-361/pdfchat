import { chunkDocument, MockEmbeddingProvider } from '@doc-chat/rag-core';

export const createDemoIngestionReport = async () => {
  const provider = new MockEmbeddingProvider();
  const parsedDocument = {
    documentId: 'demo-worker-document',
    title: 'demo-worker-document.pdf',
    pages: [
      {
        pageNumber: 1,
        text: 'Workers should own parsing, chunking, embedding, and indexing so the API stays responsive.',
      },
      {
        pageNumber: 2,
        text: 'This monorepo mirrors a production RAG system where ingestion and chat are independent execution paths.',
      },
    ],
  };

  const chunks = chunkDocument(parsedDocument);
  const vectors = await provider.embedTexts(chunks.map((chunk) => chunk.text));

  return {
    documentId: parsedDocument.documentId,
    chunks: chunks.length,
    vectorDimension: vectors[0]?.length ?? 0,
    embeddingProvider: provider.id,
  };
};

