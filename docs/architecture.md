# Architecture

This monorepo separates product concerns into deployable applications and reusable packages.

## Apps

- `apps/web`: user-facing experience for browser-offline PDF parsing, embeddings, chat, citations, and optional provider settings
- `apps/api`: stateless HTTP API for document lifecycle, upload, retrieval, chat, and optional backend provider orchestration
- `apps/worker`: background ingestion service for parse -> chunk -> embed -> index across supported text document formats

## Packages

- `packages/shared`: shared contracts, config helpers, and deployment metadata
- `packages/rag-core`: RAG pipeline primitives, prompt builders, chunking, and provider interfaces
- `packages/browser-runtime`: browser-side WebGPU/WebLLM runtime, settings, retrieval, and fallback helpers
- `packages/ui`: shared UI primitives for the web app

## Deployment shape

- store files in S3-compatible storage
- persist vectors in PostgreSQL with `pgvector`
- run the primary chat flow in the browser with WebGPU/WebLLM when available
- optionally run backend generation via Ollama or any OpenAI-compatible provider
- keep the web, API, and worker independently deployable

`GET /health` is intentionally backend-only. It reports API and optional Ollama reachability, while browser WebGPU/WebLLM support is detected in the web app settings panel.
