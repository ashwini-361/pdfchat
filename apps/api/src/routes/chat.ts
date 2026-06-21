import type { FastifyInstance } from 'fastify';

import { z } from 'zod';

import { chatWithDocument } from '../services/document-store';

const chatSchema = z.object({
  documentId: z.string().uuid(),
  question: z.string().min(5),
  topK: z.number().int().min(1).max(8).optional(),
});

export const registerChatRoutes = async (app: FastifyInstance) => {
  app.post('/v1/chat', async (request, reply) => {
    const payload = chatSchema.parse(request.body);
    const response = await chatWithDocument(payload);

    if (!response.grounded) {
      return reply.code(404).send(response);
    }

    return reply.code(200).send(response);
  });
};

