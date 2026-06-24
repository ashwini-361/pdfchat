import { describe, expect, it } from 'vitest';

import { formatRetrievedResults, interpolateBrowserPrompt } from './prompt';
import { defaultPromptTemplate } from './settings';

describe('browser prompt formatting', () => {
  it('quotes retrieved chunks for the prompt document section', () => {
    expect(formatRetrievedResults(['First source.', 'Second source.'])).toBe(
      '"First source."\n\n"Second source."',
    );
  });

  it('interpolates document title, retrieved results, and question', () => {
    const prompt = interpolateBrowserPrompt(defaultPromptTemplate, {
      documentTitle: 'Lecture.pdf',
      results: ['The model runs in the browser.', 'Ollama is optional.'],
      question: 'Where does the default model run?',
    });

    expect(prompt).toContain('Lecture.pdf');
    expect(prompt).toContain('"The model runs in the browser."');
    expect(prompt).toContain('"Ollama is optional."');
    expect(prompt).toContain('Where does the default model run?');
    expect(prompt).not.toContain('{documentTitle}');
    expect(prompt).not.toContain('{results}');
    expect(prompt).not.toContain('{question}');
  });
});
