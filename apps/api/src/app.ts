import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';

import { registerChatRoutes } from './routes/chat';
import { registerDocumentRoutes } from './routes/documents';
import { registerHealthRoutes } from './routes/health';
import { registerProductRoutes } from './routes/product';
import { registerStudyRoutes } from './routes/study';

export const buildApp = async () => {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: true,
  });
  await app.register(multipart, {
    limits: {
      fileSize: 25 * 1024 * 1024,
      files: 1,
    },
  });

  await registerHealthRoutes(app);
  await registerDocumentRoutes(app);
  await registerChatRoutes(app);
  await registerProductRoutes(app);
  await registerStudyRoutes(app);

  return app;
};
