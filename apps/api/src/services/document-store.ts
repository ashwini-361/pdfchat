import { chunkDocument, InMemoryVectorStore, MockEmbeddingProvider, MockChatProvider, runGroundedChat } from '@doc-chat/rag-core';
import type { ChatResponse, DocumentRecord, UploadRequest, UploadResponse } from '@doc-chat/shared';
import { getServiceRuntimeConfig } from '@doc-chat/shared';
import { v4 as uuidv4 } from 'uuid';

const documents = new Map<string, DocumentRecord>();
const vectorStore = new InMemoryVectorStore();
const embeddings = new MockEmbeddingProvider();
const chatProvider = new MockChatProvider();
const config = getServiceRuntimeConfig(process.env);

const now = () => new Date().toISOString();

const demoPages = [
  {
    pageNumber: 1,
    text: `This project uses a monorepo architecture with separate web, api, and worker applications. It is designed to run locally with Docker Compose and to deploy cleanly on AWS or other container platforms.`,
  },
  {
    pageNumber: 2,
    text: `Uploaded PDFs are stored in S3-compatible object storage. The ingestion worker extracts text, creates chunks, generates embeddings, and stores vectors in PostgreSQL with pgvector for durable similarity search.`,
  },
  {
    pageNumber: 3,
    text: `The model layer is provider agnostic. Development can use Ollama with Gemma locally, while production can switch to a hosted inference endpoint without changing the retrieval pipeline.`,
  },
];

export const createDocument = async (
  input: UploadRequest,
): Promise<UploadResponse> => {
  const id = uuidv4();
  const document: DocumentRecord = {
    id,
    fileName: input.fileName,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    status: 'uploaded',
    createdAt: now(),
  };

  documents.set(id, document);

  return {
    document,
    uploadUrl: `${config.objectStorageEndpoint}/${config.objectStorageBucket}/${id}`,
    objectKey: `${id}/${input.fileName}`,
  };
};

export const listDocuments = async (): Promise<DocumentRecord[]> =>
  Array.from(documents.values());

export const indexDemoDocument = async (documentId: string) => {
  const existing = documents.get(documentId);
  if (!existing) {
    return null;
  }

  existing.status = 'indexing';

  const chunks = chunkDocument({
    documentId,
    title: existing.fileName,
    pages: demoPages,
  });
  const vectors = await embeddings.embedTexts(chunks.map((chunk) => chunk.text));
  await vectorStore.upsert(chunks, vectors);

  existing.status = 'ready';
  documents.set(documentId, existing);

  return {
    documentId,
    indexedChunks: chunks.length,
    provider: embeddings.id,
  };
};

export const chatWithDocument = async (input: {
  documentId: string;
  question: string;
  topK?: number;
}): Promise<ChatResponse> =>
  runGroundedChat({
    documentId: input.documentId,
    question: input.question,
    topK: input.topK,
    embeddings,
    vectorStore,
    chatProvider,
  });

