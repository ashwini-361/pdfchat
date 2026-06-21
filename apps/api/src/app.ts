import Fastify from 'fastify';
import cors from '@fastify/cors';

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

  await registerHealthRoutes(app);
  await registerDocumentRoutes(app);
  await registerChatRoutes(app);
  await registerProductRoutes(app);
  await registerStudyRoutes(app);

  return app;
};
