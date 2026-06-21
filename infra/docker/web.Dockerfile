FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared
COPY packages/browser-runtime ./packages/browser-runtime
COPY packages/ui ./packages/ui

RUN corepack enable
RUN pnpm install --filter @doc-chat/web...

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["pnpm", "dev"]
