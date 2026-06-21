# Reference Capability Mapping

The reference project demonstrated a strong browser-native stack:

- local PDF parsing
- local embedding generation
- in-memory vector search
- WebLLM model execution in the browser
- optional lightweight local-first chat flow

This monorepo keeps those ideas through `packages/browser-runtime`, while also adding:

- server-side ingestion and retrieval for PDF, DOCX, Markdown, TXT, HTML, JSON, CSV, TSV, RTF, and log-like text
- durable vector storage with `pgvector`
- deployable API and worker services
- object storage for documents
- provider-agnostic model routing
