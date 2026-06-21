import type { ChunkRecord } from './types';

export const groundedSystemPrompt = `You are a document assistant.
Answer only using the supplied context.
If the answer is missing from the context, say so clearly.
Prefer concise, factual language.
Always preserve source grounding.`;

export const buildGroundedUserPrompt = (
  question: string,
  contextChunks: ChunkRecord[],
) => {
  const context = contextChunks
    .map(
      (chunk, index) =>
        `[${index + 1}] page=${chunk.pageNumber} chunk=${chunk.chunkId}\n${chunk.text}`,
    )
    .join('\n\n');

  return `Question:\n${question}\n\nContext:\n${context}\n\nReturn a grounded answer using only the context above.`;
};

