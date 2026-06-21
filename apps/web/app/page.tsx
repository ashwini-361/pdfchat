import { describeWebLlmStrategy } from '@doc-chat/browser-runtime';
import { Pill } from '@doc-chat/ui';

import { BenchmarkTable } from '../components/benchmark-table';
import { ChatDemo } from '../components/chat-demo';
import { DeploymentMatrix } from '../components/deployment-matrix';
import { FeatureGrid } from '../components/feature-grid';
import { StudyLab } from '../components/study-lab';
import { UploadSurface } from '../components/upload-surface';

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-poster">
        <div className="hero-layer">
          <div className="hero-copy">
            <Pill>AI Engineering Course Project</Pill>
            <h1>Chat With Any Document</h1>
            <p className="lede">
              A deployable study engine for PDFs, DOCX files, Markdown, notes,
              datasets, logs, and textbooks, designed as a full-stack monorepo.
            </p>
            <p className="supporting-copy">
              Inspired by ChatPDF, Humata, NotebookLM-style study workflows, and
              the browser-native `ask-my-pdf` reference, but rebuilt for durable
              storage, API-first extensibility, worker ingestion, and recruiter-level
              deployment clarity.
            </p>
          </div>

          <div className="hero-board">
            <div className="hero-callout">
              <span>Reference strength</span>
              <strong>Local PDF parsing, local embeddings, WebLLM-style experimentation</strong>
            </div>
            <div className="hero-callout">
              <span>Monorepo upgrade</span>
              <strong>Multi-format ingestion, study packs, multi-cloud deployment, API plus worker architecture</strong>
            </div>
            <div className="hero-callout hero-callout-accent">
              <span>Optional local mode</span>
              <strong>{describeWebLlmStrategy()}</strong>
            </div>
          </div>
        </div>

        <div className="hero-ribbon">
          <div>
            <span>Best for</span>
            <strong>college students, viva demos, recruiter walkthroughs</strong>
          </div>
          <div>
            <span>Core stack</span>
            <strong>Next.js + Fastify + Worker + pgvector + Ollama</strong>
          </div>
          <div>
            <span>New layer</span>
            <strong>flashcards, quizzes, glossary, reading plans</strong>
          </div>
        </div>
      </section>

      <section className="content-grid">
        <UploadSurface />
        <ChatDemo />
      </section>

      <StudyLab />
      <BenchmarkTable />
      <FeatureGrid />
      <DeploymentMatrix />
    </main>
  );
}
