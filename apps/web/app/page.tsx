import { describeWebLlmStrategy } from '@doc-chat/browser-runtime';
import { Pill } from '@doc-chat/ui';

import { ChatDemo } from '../components/chat-demo';
import { FeatureGrid } from '../components/feature-grid';
import { UploadSurface } from '../components/upload-surface';

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <Pill>AI Engineering Course Project</Pill>
          <h1>Chat With Any Document</h1>
          <p className="lede">
            A senior-level industry monorepo for a deployable PDF RAG platform
            inspired by ChatPDF, Humata, and browser-native local-AI experiences.
          </p>
          <p className="supporting-copy">
            The product keeps the reference repo&apos;s local-first ideas while
            upgrading the architecture for durable storage, worker-based
            ingestion, cloud deployment, and clean service boundaries.
          </p>
        </div>
        <div className="hero-panel">
          <div className="metric-card">
            <span>Primary mode</span>
            <strong>Server RAG with cloud portability</strong>
          </div>
          <div className="metric-card">
            <span>Optional mode</span>
            <strong>{describeWebLlmStrategy()}</strong>
          </div>
        </div>
      </section>

      <section className="content-grid">
        <UploadSurface />
        <ChatDemo />
      </section>

      <FeatureGrid />
    </main>
  );
}

