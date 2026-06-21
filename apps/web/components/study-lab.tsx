import { sampleStudyPack, studentFeatureModules } from '@doc-chat/shared';

export const StudyLab = () => (
  <section className="section-shell study-shell">
    <div className="section-head">
      <span className="eyebrow">Built for students</span>
      <h2>More than chat: turn readings into an exam workflow</h2>
      <p>
        ChatPDF-style Q&amp;A is useful, but college students usually need an
        actual study system. This repo now includes a study-pack layer with
        flashcards, quiz questions, glossary terms, and a timed reading plan.
      </p>
    </div>

    <div className="study-layout">
      <div className="study-modules">
        {studentFeatureModules.map((module) => (
          <article className="module-row" key={module.name}>
            <div>
              <span className={`status-dot status-${module.status}`} />
              <strong>{module.name}</strong>
            </div>
            <p>{module.value}</p>
          </article>
        ))}
      </div>

      <div className="study-pack-preview">
        <div className="study-pack-head">
          <span className="eyebrow">Preview output</span>
          <h3>{sampleStudyPack.title}</h3>
          <p>{sampleStudyPack.summary}</p>
        </div>

        <div className="study-split">
          <div>
            <h4>Flashcards</h4>
            <ul>
              {sampleStudyPack.flashcards.map((card) => (
                <li key={card.question}>
                  <strong>{card.question}</strong>
                  <span>{card.answer}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4>Quiz</h4>
            <ul>
              {sampleStudyPack.quiz.map((item) => (
                <li key={item.prompt}>
                  <strong>{item.prompt}</strong>
                  <span>Answer: {item.answer}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
);

