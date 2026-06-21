# Deployment

## Local

Run the full stack with Docker Compose:

- PostgreSQL + `pgvector`
- MinIO for S3-compatible storage
- Ollama for local open-source models
- API service
- Worker service
- Web app

## Cloud

The same containers map directly to:

- AWS: Amplify or S3/CloudFront, ECS, RDS PostgreSQL, S3, ECR
- GCP: Cloud Run, Cloud SQL, Cloud Storage
- Azure: Container Apps, Azure Database for PostgreSQL, Blob Storage
- Render or Railway: Web Service, Worker, Managed Postgres, S3-compatible storage

## Recruiter explanation

This architecture is portable because compute stays stateless while only documents and vectors are persisted.

