import { deploymentTargets } from '@doc-chat/shared';

export const DeploymentMatrix = () => (
  <section className="section-shell">
    <div className="section-head">
      <span className="eyebrow">Deploy anywhere</span>
      <h2>One architecture, multiple cloud stories</h2>
      <p>
        The repo is intentionally container-first so the same product maps cleanly
        to AWS, Cloud Run, Azure Container Apps, or fast-moving student platforms
        like Render and Railway.
      </p>
    </div>

    <div className="deployment-grid">
      {deploymentTargets.map((target) => (
        <article className="deployment-item" key={target.name}>
          <h3>{target.name}</h3>
          <dl>
            <div>
              <dt>Frontend</dt>
              <dd>{target.frontend}</dd>
            </div>
            <div>
              <dt>Services</dt>
              <dd>{target.services}</dd>
            </div>
            <div>
              <dt>Storage</dt>
              <dd>{target.storage}</dd>
            </div>
          </dl>
          <p>{target.whyChooseIt}</p>
        </article>
      ))}
    </div>
  </section>
);

