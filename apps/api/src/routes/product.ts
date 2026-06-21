import type { FastifyInstance } from 'fastify';

import {
  listCompetitiveBenchmarks,
  listDeploymentTargets,
  listStudentFeatures,
} from '../services/product-intelligence';

export const registerProductRoutes = async (app: FastifyInstance) => {
  app.get('/v1/product/benchmarks', async () => listCompetitiveBenchmarks());
  app.get('/v1/product/student-features', async () => listStudentFeatures());
  app.get('/v1/product/deployments', async () => listDeploymentTargets());
};

