export interface BrowserPromptInput {
  documentTitle: string;
  results: string[];
  question: string;
}

export const formatRetrievedResults = (results: string[]) =>
  results.map((result) => `"${result}"`).join('\n\n');

export const interpolateBrowserPrompt = (
  template: string,
  input: BrowserPromptInput,
) =>
  template
    .replaceAll('{documentTitle}', input.documentTitle)
    .replaceAll('{results}', formatRetrievedResults(input.results))
    .replaceAll('{question}', input.question);
