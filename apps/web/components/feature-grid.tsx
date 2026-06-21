import { referenceInspiredCapabilities } from '@doc-chat/browser-runtime';
import { Card, Pill } from '@doc-chat/ui';

import { runtime } from '../lib/runtime';

const capabilityFlags = {
  browserRagEnabled: runtime.browserRagEnabled,
  webLlmEnabled: runtime.webLlmEnabled,
};

export const FeatureGrid = () => {
  const capabilities = referenceInspiredCapabilities(capabilityFlags);

  return (
    <section className="section-shell">
      <div className="section-head">
        <span className="eyebrow">Local-first capabilities</span>
        <h2>Keep the best parts of the browser-native reference</h2>
        <p>
          The reference repo proved that useful PDF chat can happen directly in
          the browser. This monorepo preserves that option while making multi-format
          server-side ingestion the default path for persistence and deployment.
        </p>
      </div>
      <div className="feature-grid">
      <Card title="Reference-inspired capabilities">
        <div className="stack">
          {capabilities.map((capability) => (
            <div className="capability" key={capability.id}>
              <div className="capability-header">
                <strong>{capability.label}</strong>
                <Pill tone={capability.enabled ? 'success' : 'warning'}>
                  {capability.enabled ? 'enabled' : 'optional'}
                </Pill>
              </div>
              <p>{capability.note}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Production deployment shape">
        <ul className="bullet-list">
          <li>Stateless web, API, and worker services</li>
          <li>PostgreSQL with pgvector for durable retrieval</li>
          <li>S3-compatible object storage for PDFs, DOCX, Markdown, TXT, HTML, JSON, CSV, TSV, RTF, and logs</li>
          <li>Provider-agnostic model routing with Ollama by default</li>
          <li>Cloud-portable containers for AWS, GCP, Azure, Render, and Railway</li>
        </ul>
      </Card>
      </div>
    </section>
  );
};
