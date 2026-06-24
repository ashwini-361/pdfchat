# Deployment

## Local

Run the full stack with Docker Compose:

- PostgreSQL + `pgvector`
- MinIO for S3-compatible storage
- optional Ollama for backend open-source models
- API service
- Worker service
- Web app

The default user-facing PDF chat path runs in the browser. It uses PDF.js,
Transformers.js embeddings, WebLLM generation, and the fallback order WebLLM ->
Chrome Prompt API -> extractive local answer.

The optional backend RAG path can use Ollama:

- `CHAT_PROVIDER=ollama`
- `EMBEDDING_PROVIDER=ollama`
- `OLLAMA_CHAT_MODEL=gemma3:4b`
- `OLLAMA_EMBEDDING_MODEL=nomic-embed-text`

Before sending backend chat requests, pull the models into the same Ollama
runtime that the API uses:

```bash
ollama pull gemma3:4b
ollama pull nomic-embed-text
```

`GET /health` reports backend provider status only. Browser WebGPU/WebLLM
support is measured in the web app settings panel. For backend demos without
Ollama model downloads, set `CHAT_PROVIDER=mock` and `EMBEDDING_PROVIDER=mock`.

## Cloud

The same containers map directly to:

- AWS: Amplify or S3/CloudFront, ECS, RDS PostgreSQL, S3, ECR
- GCP: Cloud Run, Cloud SQL, Cloud Storage
- Azure: Container Apps, Azure Database for PostgreSQL, Blob Storage
- Render or Railway: Web Service, Worker, Managed Postgres, S3-compatible storage

## Recruiter explanation

This architecture is portable because compute stays stateless while only documents and vectors are persisted.
