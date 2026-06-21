import type { FastifyInstance } from 'fastify';

import { z } from 'zod';

import { createDocument, indexDemoDocument, listDocuments } from '../services/document-store';

const uploadSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
});

export const registerDocumentRoutes = async (app: FastifyInstance) => {
  app.get('/v1/documents', async () => listDocuments());

  app.post('/v1/documents', async (request, reply) => {
    const payload = uploadSchema.parse(request.body);
    const response = await createDocument(payload);
    return reply.code(201).send(response);
  });

  app.post('/v1/documents/:documentId/index-demo', async (request, reply) => {
    const params = z
      .object({ documentId: z.string().uuid() })
      .parse(request.params);

    const result = await indexDemoDocument(params.documentId);

    if (!result) {
      return reply.code(404).send({ message: 'Document not found' });
    }

    return reply.code(202).send(result);
  });
};

