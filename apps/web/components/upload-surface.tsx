'use client';

import { useMemo, useState } from 'react';

import { Card, Pill } from '@doc-chat/ui';

import { runtime } from '../lib/runtime';

type UploadState = 'idle' | 'uploading' | 'done' | 'error';

type UploadResult = {
  document: {
    id: string;
    fileName: string;
    status: string;
    documentType?: string;
    chunkCount?: number;
    pageCount?: number;
  };
  indexedChunks?: number;
  parser?: string;
  embeddingProvider?: string;
  message?: string;
};

const acceptedExtensions = '.pdf,.docx,.md,.markdown,.txt,.html,.htm,.json,.csv,.tsv,.rtf,.log';

const normalizeEndpoint = (baseUrl: string) =>
  baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

export const UploadSurface = () => {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>('idle');
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supportedFormats, setSupportedFormats] = useState<string[] | null>(null);
  const [loadingFormats, setLoadingFormats] = useState(false);

  const uploadLabel = useMemo(() => {
    if (state === 'uploading') {
      return 'Uploading';
    }

    if (result) {
      return 'Uploaded';
    }

    return 'Upload';
  }, [result, state]);

  const loadSupportedFormats = async () => {
    if (supportedFormats) {
      return;
    }

    setLoadingFormats(true);
    try {
      const response = await fetch(
        `${normalizeEndpoint(runtime.apiBaseUrl)}/v1/documents/supported-formats`,
      );
      if (!response.ok) {
        throw new Error('Unable to load supported formats.');
      }

      const data = (await response.json()) as { formats: string[] };
      setSupportedFormats(data.formats);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load formats.');
    } finally {
      setLoadingFormats(false);
    }
  };

  const submitUpload = async () => {
    if (!file) {
      setError('Choose a document first.');
      return;
    }

    setState('uploading');
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${normalizeEndpoint(runtime.apiBaseUrl)}/v1/documents/upload`,
        {
          method: 'POST',
          body: formData,
        },
      );

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message ?? 'Upload failed.');
      }

      setResult(payload as UploadResult);
      setState('done');
    } catch (uploadError) {
      setState('error');
      setError(
        uploadError instanceof Error ? uploadError.message : 'Upload failed.',
      );
    }
  };

  return (
    <Card title="Upload and ingestion">
      <div className="stack">
        <div className="badge-row">
          <Pill>API: {runtime.apiBaseUrl}</Pill>
          <Pill tone={runtime.pdfPreviewEnabled ? 'success' : 'warning'}>
            document preview {runtime.pdfPreviewEnabled ? 'on' : 'off'}
          </Pill>
        </div>
        <p>
          Upload PDFs, DOCX files, Markdown, TXT, HTML, JSON, CSV, TSV, RTF, or
          logs. The API parses the file, indexes chunks, and keeps browser-side
          local inference available for privacy-first or demo modes.
        </p>

        <label className="upload-picker" htmlFor="document-upload">
          <span>{file ? file.name : 'Drop a document here or choose a file'}</span>
          <small>
            {file ? `${Math.round(file.size / 1024)} KB` : 'Single file upload, multipart request'}
          </small>
          <input
            id="document-upload"
            type="file"
            accept={acceptedExtensions}
            onChange={(event) => {
              const selected = event.target.files?.[0] ?? null;
              setFile(selected);
              setResult(null);
              setError(null);
            }}
          />
        </label>

        <div className="upload-actions">
          <button
            className="button"
            type="button"
            onClick={submitUpload}
            disabled={!file || state === 'uploading'}
          >
            {uploadLabel}
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={loadSupportedFormats}
            disabled={loadingFormats}
          >
            {loadingFormats ? 'Loading formats' : 'Supported formats'}
          </button>
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        {result ? (
          <div className="upload-result">
            <strong>{result.document.fileName}</strong>
            <p>
              Indexed as {result.parser ?? result.document.documentType ?? 'document'} with{' '}
              {result.indexedChunks ?? result.document.chunkCount ?? 0} chunks.
            </p>
            <small>
              Document id: {result.document.id}
              {result.embeddingProvider ? ` | Embeddings: ${result.embeddingProvider}` : ''}
            </small>
          </div>
        ) : null}

        {supportedFormats ? (
          <div className="upload-result">
            <strong>Supported formats</strong>
            <p>{supportedFormats.join(', ')}</p>
          </div>
        ) : null}
      </div>
    </Card>
  );
};
