import type {
  DeploymentTarget,
  FeatureBenchmark,
  StudentFeatureModule,
  StudyPack,
} from './contracts';

export const competitiveBenchmarks: FeatureBenchmark[] = [
  {
    feature: 'Browser-native PDF parsing',
    referenceRepo: 'Implemented with PDF.js in the browser',
    currentMonorepo:
      'Preserved as an optional browser-runtime capability plus server-side ingestion',
    whyItMatters:
      'Keeps privacy-friendly local previews while adding a more deployable backend path',
  },
  {
    feature: 'Local embeddings and search',
    referenceRepo: 'Transformers.js embeddings with in-memory vector search',
    currentMonorepo:
      'Optional browser mode plus production path designed for PostgreSQL with pgvector',
    whyItMatters:
      'Students can demo locally, while teams get durable retrieval and multi-user scaling',
  },
  {
    feature: 'Grounded citations',
    referenceRepo: 'Strong browser citation flow',
    currentMonorepo:
      'Grounded chat contract and citation model implemented across API and UI starter code',
    whyItMatters:
      'Citation-first UX is critical for assignments, research, and exam trust',
  },
  {
    feature: 'Multi-file comparison',
    referenceRepo: 'Single-document oriented browser flow',
    currentMonorepo:
      'Architecture prepared for multi-document indexing and compare-first study workflows',
    whyItMatters:
      'Students often study from lecture notes, textbook chapters, and papers together',
  },
  {
    feature: 'Study outputs',
    referenceRepo: 'Chat-first experience',
    currentMonorepo:
      'Adds study-pack generation with summary, flashcards, quiz questions, glossary, and reading plan',
    whyItMatters:
      'Turns a document chatbot into a practical exam-prep tool',
  },
  {
    feature: 'Deployment portability',
    referenceRepo: 'Mostly browser-hosted experience',
    currentMonorepo:
      'Built as web + API + worker + storage + vector DB, ready for AWS, GCP, Azure, or Render',
    whyItMatters:
      'This is the version that recruiters can map to real production architecture',
  },
];

export const studentFeatureModules: StudentFeatureModule[] = [
  {
    name: 'Flashcard studio',
    status: 'implemented',
    value:
      'Generate active-recall prompts directly from an indexed document to make revision faster.',
  },
  {
    name: 'Quiz mode',
    status: 'implemented',
    value:
      'Turn the same source into multiple-choice questions with explanations and answer keys.',
  },
  {
    name: 'Reading plan',
    status: 'implemented',
    value:
      'Break a long paper or chapter into short study sessions with explicit objectives.',
  },
  {
    name: 'Multi-source compare',
    status: 'starter',
    value:
      'Compare course notes, papers, and handouts in one retrieval flow instead of separate chats.',
  },
  {
    name: 'Audio overview',
    status: 'planned',
    value:
      'A future mode inspired by study tools that convert source material into a quick listening pass.',
  },
  {
    name: 'Anki export',
    status: 'planned',
    value:
      'Prepare generated flashcards for spaced-repetition workflows students already use.',
  },
];

export const deploymentTargets: DeploymentTarget[] = [
  {
    name: 'AWS ECS + S3 + RDS',
    frontend: 'Amplify Hosting or S3 + CloudFront',
    services: 'ECS/Fargate for API and worker',
    storage: 'S3 for files, RDS PostgreSQL + pgvector for retrieval',
    whyChooseIt:
      'Best recruiter story for containers, object storage, and durable vector search.',
  },
  {
    name: 'Google Cloud Run',
    frontend: 'Cloud Run or static hosting + CDN',
    services: 'Cloud Run for API and worker, optional GPU inference service',
    storage: 'Cloud Storage + Cloud SQL PostgreSQL',
    whyChooseIt:
      'Strong serverless container story with scale-to-zero and optional GPU inference.',
  },
  {
    name: 'Azure Container Apps',
    frontend: 'Static Web Apps',
    services: 'Container Apps for APIs, jobs, and event-driven workers',
    storage: 'Blob Storage + Azure Database for PostgreSQL',
    whyChooseIt:
      'Clean fit for microservices, background jobs, and event-driven scaling.',
  },
  {
    name: 'Render or Railway',
    frontend: 'Static site or web service',
    services: 'Managed web service plus worker process',
    storage: 'Managed PostgreSQL + external S3-compatible bucket',
    whyChooseIt:
      'Fastest path for a college demo with minimal DevOps overhead.',
  },
];

export const sampleStudyPack: StudyPack = {
  documentId: 'demo-study-pack',
  title: 'Distributed RAG Systems - exam prep pack',
  summary:
    'This study pack condenses a deployment-ready PDF chat system into the core ideas students need for viva, interviews, and exams: ingestion, chunking, embeddings, retrieval, grounding, and deployment.',
  flashcards: [
    {
      question: 'Why is pgvector better than an in-memory vector store for production?',
      answer:
        'It gives durable storage, SQL filtering, and deployment-friendly persistence for multi-user systems.',
      difficulty: 'easy',
    },
    {
      question: 'Why separate the API and the worker in a RAG system?',
      answer:
        'The API can stay responsive while ingestion, chunking, and embedding happen asynchronously.',
      difficulty: 'medium',
    },
    {
      question: 'What is the purpose of citations in a PDF chat product?',
      answer:
        'They let users verify claims against the source text and reduce trust issues around hallucinations.',
      difficulty: 'easy',
    },
  ],
  quiz: [
    {
      prompt: 'Which service is the best default AWS compute target for the API in this repo?',
      options: ['Lambda only', 'ECS/Fargate', 'S3 Website Hosting', 'Route 53'],
      answer: 'ECS/Fargate',
      explanation:
        'The architecture is container-first, so ECS/Fargate is the cleanest fit for the API and worker.',
    },
    {
      prompt: 'What happens after the user uploads a PDF?',
      options: [
        'It is sent directly to the LLM',
        'The worker parses, chunks, embeds, and indexes it',
        'It is immediately converted into HTML only',
        'It is stored in the browser forever',
      ],
      answer: 'The worker parses, chunks, embeds, and indexes it',
      explanation:
        'The upload path should store the file, then hand ingestion to a background worker.',
    },
  ],
  glossary: [
    {
      term: 'RAG',
      definition:
        'Retrieval-Augmented Generation, where the model answers using retrieved context instead of only its internal memory.',
    },
    {
      term: 'Chunking',
      definition:
        'Splitting a document into smaller units so retrieval can find the most relevant passages.',
    },
    {
      term: 'Grounding',
      definition:
        'Constraining model answers to source-backed evidence from the indexed document.',
    },
  ],
  readingPlan: [
    {
      title: 'Ingestion and chunking',
      durationMinutes: 20,
      objective:
        'Understand how PDFs become searchable chunks with metadata like page number and source.',
    },
    {
      title: 'Retrieval and citations',
      durationMinutes: 15,
      objective:
        'Focus on why vector search and source references matter for trustworthy answers.',
    },
    {
      title: 'Deployment and interview prep',
      durationMinutes: 15,
      objective:
        'Practice explaining the web, API, worker, object storage, and pgvector architecture clearly.',
    },
  ],
};
