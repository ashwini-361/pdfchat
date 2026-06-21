import type { FastifyInstance } from 'fastify';

import { z } from 'zod';

import { getDocument } from '../services/document-store';
import { generateStudyPack } from '../services/product-intelligence';

const studyPackSchema = z.object({
  documentId: z.string().uuid(),
  focus: z.string().min(2).max(120).optional(),
});

export const registerStudyRoutes = async (app: FastifyInstance) => {
  app.post('/v1/study-pack', async (request, reply) => {
    const payload = studyPackSchema.parse(request.body);
    const document = await getDocument(payload.documentId);

    if (!document) {
      return reply.code(404).send({ message: 'Document not found' });
    }

    const pack = await generateStudyPack({
      documentId: payload.documentId,
      title: `${document.fileName} study pack`,
      focus: payload.focus,
    });

    return reply.code(200).send(pack);
  });
};

