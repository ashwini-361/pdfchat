FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/worker ./apps/worker
COPY packages/shared ./packages/shared
COPY packages/rag-core ./packages/rag-core

RUN corepack enable
RUN pnpm install --filter @doc-chat/worker...

WORKDIR /app/apps/worker

CMD ["pnpm", "dev"]
