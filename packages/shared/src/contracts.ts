export const documentStatuses = [
  'uploaded',
  'indexing',
  'ready',
  'failed',
] as const;

export type DocumentStatus = (typeof documentStatuses)[number];

export interface SourceCitation {
  documentId: string;
  chunkId: string;
  pageNumber: number;
  score: number;
  excerpt: string;
}

export interface DocumentRecord {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  status: DocumentStatus;
  createdAt: string;
}

export interface UploadRequest {
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

export interface UploadResponse {
  document: DocumentRecord;
  uploadUrl: string;
  objectKey: string;
}

export interface ChatRequest {
  documentId: string;
  question: string;
  topK?: number;
  mode?: 'server-rag' | 'browser-rag';
}

export interface ChatResponse {
  answer: string;
  citations: SourceCitation[];
  model: string;
  grounded: boolean;
}

export interface BrowserCapability {
  id:
    | 'local-pdf-parse'
    | 'local-embeddings'
    | 'in-memory-search'
    | 'web-llm-chat';
  label: string;
  enabled: boolean;
  note: string;
}

export interface StudyFlashcard {
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface StudyQuizQuestion {
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface StudyGlossaryItem {
  term: string;
  definition: string;
}

export interface StudyPlanStep {
  title: string;
  durationMinutes: number;
  objective: string;
}

export interface StudyPack {
  documentId: string;
  title: string;
  summary: string;
  flashcards: StudyFlashcard[];
  quiz: StudyQuizQuestion[];
  glossary: StudyGlossaryItem[];
  readingPlan: StudyPlanStep[];
}

export interface FeatureBenchmark {
  feature: string;
  referenceRepo: string;
  currentMonorepo: string;
  whyItMatters: string;
}

export interface StudentFeatureModule {
  name: string;
  status: 'implemented' | 'starter' | 'planned';
  value: string;
}

export interface DeploymentTarget {
  name: string;
  frontend: string;
  services: string;
  storage: string;
  whyChooseIt: string;
}
