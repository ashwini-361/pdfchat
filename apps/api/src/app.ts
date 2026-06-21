import Fastify from 'fastify';
import cors from '@fastify/cors';

import { registerChatRoutes } from './routes/chat';
import { registerDocumentRoutes } from './routes/documents';
import { registerHealthRoutes } from './routes/health';

export const buildApp = async () => {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: true,
  });

  await registerHealthRoutes(app);
  await registerDocumentRoutes(app);
  await registerChatRoutes(app);

  return app;
};

