# Product benchmark

This benchmark compares the current monorepo direction against the browser-native reference app and the current feature patterns visible in document AI products used by students and researchers.

## Reference observations

### Browser-native reference repo

The reference project centers on:

- local PDF parsing in the browser
- local embedding generation
- in-memory vector search
- WebLLM model execution in the browser

Repo: [ashwini-961/ask-my-pdf](https://github.com/ashwini-961/ask-my-pdf)

### ChatPDF

Official site highlights:

- cited sources
- multi-file chats
- multilingual usage
- side-by-side view

Source: [ChatPDF](https://www.chatpdf.com/)

### Humata

Official site highlights:

- turns documents into a fast knowledge base
- instant analysis, insights, and answers

Source: [Humata](https://www.humata.ai/)

## What this repo adds

- full-stack monorepo shape instead of browser-only delivery
- API and worker separation for production-style ingestion
- deployment mapping for AWS, Cloud Run, Azure Container Apps, and student-friendly platforms
- study-pack generation as a first-class product concept:
  - summary
  - flashcards
  - quiz questions
  - glossary
  - reading plan

## Why these features were prioritized

The most useful additions for college students are not only better chat quality, but better learning workflows:

- flashcards for active recall
- quizzes for self-testing
- reading plans for long chapters and papers
- glossary extraction for quick revision
- multi-document comparison for notes plus textbook plus paper study sessions

These study-pack features are the product direction chosen for this repo after comparing current document-AI patterns and focusing on what is most useful in a college workflow.

## Implementation honesty

Current repo status:

- product shell: implemented
- benchmark and deployment layer: implemented
- study-pack preview and contracts: implemented
- real pgvector persistence: next
- real PDF ingestion: next
- Ollama adapters: next
