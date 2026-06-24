# Deployment

## Local

Run the full stack with Docker Compose:

- PostgreSQL + `pgvector`
- MinIO for S3-compatible storage
- Ollama for local open-source models
- API service
- Worker service
- Web app

The backend RAG path uses Ollama by default:

- `CHAT_PROVIDER=ollama`
- `EMBEDDING_PROVIDER=ollama`
- `OLLAMA_CHAT_MODEL=gemma3:4b`
- `OLLAMA_EMBEDDING_MODEL=nomic-embed-text`

Before sending chat requests, pull the models into the same Ollama runtime that
the API uses:

```bash
ollama pull gemma3:4b
ollama pull nomic-embed-text
```

`GET /health` reports the active backend provider, the execution target, and
whether the required Ollama models are reachable. For local demos without model
downloads, set `CHAT_PROVIDER=mock` and `EMBEDDING_PROVIDER=mock`.

## Cloud

The same containers map directly to:

- AWS: Amplify or S3/CloudFront, ECS, RDS PostgreSQL, S3, ECR
- GCP: Cloud Run, Cloud SQL, Cloud Storage
- Azure: Container Apps, Azure Database for PostgreSQL, Blob Storage
- Render or Railway: Web Service, Worker, Managed Postgres, S3-compatible storage

## Recruiter explanation

This architecture is portable because compute stays stateless while only documents and vectors are persisted.
