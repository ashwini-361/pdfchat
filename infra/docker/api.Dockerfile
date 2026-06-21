FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
COPY packages/rag-core ./packages/rag-core

RUN corepack enable
RUN pnpm install --filter @doc-chat/api...

WORKDIR /app/apps/api

EXPOSE 4000

CMD ["pnpm", "dev"]
