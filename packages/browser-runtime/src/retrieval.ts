export interface BrowserDocumentPage {
  page: number;
  text: string;
}

export interface BrowserDocumentChunk {
  id: string;
  page: number;
  text: string;
  index: number;
  terms: Map<string, number>;
}

export interface BrowserVectorEntry extends BrowserDocumentChunk {
  vector: number[];
  magnitude: number;
}

export interface BrowserRetrievedChunk extends BrowserDocumentChunk {
  score: number;
}

const stopWords = new Set([
  'about',
  'after',
  'also',
  'am',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'because',
  'between',
  'by',
  'do',
  'from',
  'have',
  'hi',
  'in',
  'into',
  'is',
  'it',
  'of',
  'on',
  'or',
  'that',
  'their',
  'there',
  'the',
  'these',
  'this',
  'through',
  'using',
  'were',
  'what',
  'when',
  'where',
  'which',
  'with',
  'would',
]);

const queryExpansions = new Map<string, string[]>([
  ['ai', ['artificial', 'intelligence']],
  ['dbms', ['database', 'management', 'system']],
  ['knn', ['nearest', 'neighbor']],
  ['ml', ['machine', 'learning']],
  ['nlp', ['natural', 'language', 'processing']],
  ['pca', ['principal', 'component', 'analysis']],
  ['svm', ['support', 'vector', 'machine']],
]);

export const tokenizeBrowserText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((term) => term.length > 1 && !stopWords.has(term));

export const expandBrowserQueryTerms = (terms: Iterable<string>) => {
  const expanded = new Set<string>();
  for (const term of terms) {
    expanded.add(term);
    for (const related of queryExpansions.get(term) ?? []) {
      expanded.add(related);
    }
  }

  return expanded;
};

export const splitBrowserSentences = (text: string) =>
  text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

export const createBrowserDocumentChunks = (
  pages: BrowserDocumentPage[],
  targetWords = 150,
) => {
  const chunks: BrowserDocumentChunk[] = [];

  for (const page of pages) {
    let buffer: string[] = [];
    let wordCount = 0;

    for (const sentence of splitBrowserSentences(page.text)) {
      const sentenceWords = sentence.split(/\s+/).length;
      if (wordCount + sentenceWords > targetWords && buffer.length > 0) {
        chunks.push(createChunk(page.page, chunks.length, buffer.join(' ')));
        buffer = [];
        wordCount = 0;
      }

      buffer.push(sentence);
      wordCount += sentenceWords;
    }

    if (buffer.length > 0) {
      chunks.push(createChunk(page.page, chunks.length, buffer.join(' ')));
    }
  }

  return chunks;
};

export const createVectorEntries = (
  chunks: BrowserDocumentChunk[],
  vectors: number[][],
): BrowserVectorEntry[] =>
  chunks.map((chunk, index) => ({
    ...chunk,
    vector: vectors[index] ?? [],
    magnitude: calculateMagnitude(vectors[index] ?? []),
  }));

export const searchVectorEntries = (
  queryVector: number[],
  entries: BrowserVectorEntry[],
  options: { maxResults: number; similarityThreshold: number },
): BrowserRetrievedChunk[] => {
  const queryMagnitude = calculateMagnitude(queryVector);
  const threshold = options.similarityThreshold / 100;

  return entries
    .map((entry) => ({
      ...entry,
      score: normalizeScore(
        cosineSimilarity(
          queryVector,
          entry.vector,
          queryMagnitude,
          entry.magnitude,
        ),
      ),
    }))
    .filter((entry) => entry.score >= threshold)
    .sort((left, right) => right.score - left.score)
    .slice(0, options.maxResults);
};

export const searchTerms = (
  question: string,
  chunks: BrowserDocumentChunk[],
  options: { maxResults: number; similarityThreshold?: number },
): BrowserRetrievedChunk[] => {
  const uniqueTerms = expandBrowserQueryTerms(tokenizeBrowserText(question));

  return chunks
    .map((chunk) => {
      let score = 0;
      for (const term of uniqueTerms) {
        const frequency = chunk.terms.get(term) ?? 0;
        if (frequency > 0) {
          score += 1 + Math.log(frequency + 1);
        }
      }

      return {
        ...chunk,
        score: uniqueTerms.size ? Math.min(1, score / uniqueTerms.size) : 0,
      };
    })
    .filter(
      (chunk) =>
        chunk.score >
        Math.max(0, Math.min(100, options.similarityThreshold ?? 0)) / 100,
    )
    .sort((left, right) => right.score - left.score)
    .slice(0, options.maxResults);
};

export const expandRetrievedChunks = (
  retrieved: BrowserRetrievedChunk[],
  allChunks: BrowserDocumentChunk[],
  surroundingResults: number,
) => {
  const selected = new Map<string, BrowserDocumentChunk>();

  for (const result of retrieved) {
    const start = Math.max(0, result.index - surroundingResults);
    const end = Math.min(
      allChunks.length - 1,
      result.index + surroundingResults,
    );
    for (let index = start; index <= end; index += 1) {
      const chunk = allChunks[index];
      if (chunk && chunk.page === result.page) {
        selected.set(chunk.id, chunk);
      }
    }
  }

  return Array.from(selected.values()).sort(
    (left, right) => left.index - right.index,
  );
};

export const extractiveBrowserAnswer = (
  question: string,
  sources: BrowserRetrievedChunk[],
) => {
  if (sources.length === 0) {
    return 'I could not find enough matching text in the PDF. Try using words that appear in the document.';
  }

  const queryTerms = new Set(tokenizeBrowserText(question));
  const sentences = sources
    .flatMap((source) =>
      splitBrowserSentences(source.text).map((sentence) => ({
        sentence,
        page: source.page,
        score: tokenizeBrowserText(sentence).reduce(
          (total, term) => total + (queryTerms.has(term) ? 2 : 0),
          0,
        ),
      })),
    )
    .filter((item) => item.sentence.length > 35)
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map((item) => `${item.sentence} (page ${item.page})`);

  return sentences.length
    ? `Based on the PDF, ${sentences.join(' ')}`
    : `Based on the PDF, ${sources
        .slice(0, 2)
        .map((source) => `${source.text} (page ${source.page})`)
        .join(' ')}`;
};

const createChunk = (page: number, index: number, text: string) => ({
  id: `p${page}-c${index + 1}`,
  page,
  text: text.trim(),
  index,
  terms: termMap(text),
});

const termMap = (text: string) => {
  const counts = new Map<string, number>();
  for (const term of tokenizeBrowserText(text)) {
    counts.set(term, (counts.get(term) ?? 0) + 1);
  }
  return counts;
};

const calculateMagnitude = (vector: number[]) =>
  Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));

const cosineSimilarity = (
  left: number[],
  right: number[],
  leftMagnitude = calculateMagnitude(left),
  rightMagnitude = calculateMagnitude(right),
) => {
  if (!leftMagnitude || !rightMagnitude || left.length !== right.length) {
    return 0;
  }

  let dot = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
  }

  return dot / (leftMagnitude * rightMagnitude);
};

const normalizeScore = (score: number) => (score + 1) / 2;
