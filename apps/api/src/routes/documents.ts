import type { FastifyInstance } from 'fastify';

import { getSupportedDocumentSummary } from '@doc-chat/rag-core';
import { z } from 'zod';

import {
  createDocument,
  getDocument,
  indexDemoDocument,
  indexUploadedDocument,
  listDocuments,
} from '../services/document-store';

const uploadSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
});

export const registerDocumentRoutes = async (app: FastifyInstance) => {
  app.get('/v1/documents', async () => listDocuments());

  app.get('/v1/documents/supported-formats', async () => ({
    formats: getSupportedDocumentSummary(),
    uploadEndpoint: '/v1/documents/upload',
  }));

  app.get('/v1/documents/:documentId', async (request, reply) => {
    const params = z
      .object({ documentId: z.string().uuid() })
      .parse(request.params);
    const document = await getDocument(params.documentId);

    if (!document) {
      return reply.code(404).send({ message: 'Document not found' });
    }

    return document;
  });

  app.post('/v1/documents', async (request, reply) => {
    const payload = uploadSchema.parse(request.body);
    const response = await createDocument(payload);
    return reply.code(201).send(response);
  });

  app.post('/v1/documents/upload', async (request, reply) => {
    const file = await request.file();

    if (!file) {
      return reply.code(400).send({ message: 'Upload a document file.' });
    }

    const buffer = await file.toBuffer();
    try {
      const result = await indexUploadedDocument({
        fileName: file.filename,
        contentType: file.mimetype,
        buffer,
      });

      return reply.code(201).send(result);
    } catch (error) {
      return reply.code(415).send({
        message:
          error instanceof Error
            ? error.message
            : 'Unsupported or unreadable document.',
      });
    }
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
