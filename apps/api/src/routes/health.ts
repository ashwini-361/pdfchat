import type { FastifyInstance } from 'fastify';

import { getServiceRuntimeConfig } from '@doc-chat/shared';

export const registerHealthRoutes = async (app: FastifyInstance) => {
  app.get('/health', async () => {
    const config = getServiceRuntimeConfig(process.env);

    return {
      status: 'ok',
      service: 'api',
      appEnv: config.appEnv,
      model: config.ollamaChatModel,
    };
  });
};

