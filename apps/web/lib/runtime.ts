import { getPublicRuntimeConfig } from '@doc-chat/shared';

export const runtime = getPublicRuntimeConfig({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_BROWSER_RAG_ENABLED: process.env.NEXT_PUBLIC_BROWSER_RAG_ENABLED,
  NEXT_PUBLIC_WEB_LLM_ENABLED: process.env.NEXT_PUBLIC_WEB_LLM_ENABLED,
  NEXT_PUBLIC_PDF_PREVIEW_ENABLED: process.env.NEXT_PUBLIC_PDF_PREVIEW_ENABLED,
});

