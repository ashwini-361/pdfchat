'use client';

import { useState } from 'react';

import { Card } from '@doc-chat/ui';

const initialAnswer =
  'Grounded answers appear here after the API retrieves chunks, cites source pages, and optionally spins out a study pack for revision.';

export const ChatDemo = () => {
  const [question, setQuestion] = useState(
    'What is the main deployment architecture of this project?',
  );
  const [answer, setAnswer] = useState(initialAnswer);

  return (
    <Card title="Product demo surface">
      <div className="stack">
        <label className="label" htmlFor="question">
          Ask a question about an indexed PDF
        </label>
        <textarea
          id="question"
          className="textarea"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <button
          className="button"
          type="button"
          onClick={() =>
            setAnswer(
              `The stack separates the web app, API, and ingestion worker so each can deploy independently, then layers study outputs such as flashcards and quizzes on top of grounded retrieval. Question captured: "${question}".`,
            )
          }
        >
          Simulate grounded answer
        </button>
        <div className="answer-box">
          <strong>Answer</strong>
          <p>{answer}</p>
          <span className="caption">
            Citations would point to page numbers and chunk ids from the vector
            store.
          </span>
        </div>
      </div>
    </Card>
  );
};
