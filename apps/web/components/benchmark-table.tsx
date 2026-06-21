import { competitiveBenchmarks } from '@doc-chat/shared';

export const BenchmarkTable = () => (
  <section className="section-shell benchmark-shell">
    <div className="section-head">
      <span className="eyebrow">Feature benchmark</span>
      <h2>What changed from the reference app to this full-stack monorepo</h2>
      <p>
        The browser-first reference is excellent for local demos. This version
        keeps the local-AI spirit but adds the persistence, service boundaries,
        and study workflows recruiters expect from a real product.
      </p>
    </div>

    <div className="benchmark-table">
      <div className="benchmark-row benchmark-header">
        <span>Feature</span>
        <span>Reference repo</span>
        <span>This repo</span>
        <span>Why it matters</span>
      </div>
      {competitiveBenchmarks.map((row) => (
        <div className="benchmark-row" key={row.feature}>
          <strong>{row.feature}</strong>
          <p>{row.referenceRepo}</p>
          <p>{row.currentMonorepo}</p>
          <p>{row.whyItMatters}</p>
        </div>
      ))}
    </div>
  </section>
);

