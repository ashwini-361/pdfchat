# Architecture

This monorepo separates product concerns into deployable applications and reusable packages.

## Apps

- `apps/web`: user-facing experience for upload, chat, citations, and optional browser-side AI features
- `apps/api`: stateless HTTP API for document lifecycle, upload, retrieval, chat, and provider orchestration
- `apps/worker`: background ingestion service for parse -> chunk -> embed -> index across supported text document formats

## Packages

- `packages/shared`: shared contracts, config helpers, and deployment metadata
- `packages/rag-core`: RAG pipeline primitives, prompt builders, chunking, and provider interfaces
- `packages/browser-runtime`: browser-side capability layer inspired by the reference repo
- `packages/ui`: shared UI primitives for the web app

## Deployment shape

- store files in S3-compatible storage
- persist vectors in PostgreSQL with `pgvector`
- run chat generation via Ollama or any OpenAI-compatible provider
- keep the web, API, and worker independently deployable
