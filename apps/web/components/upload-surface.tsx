import { Card, Pill } from '@doc-chat/ui';

import { runtime } from '../lib/runtime';

export const UploadSurface = () => (
  <Card title="Upload and ingestion">
    <div className="stack">
      <div className="badge-row">
        <Pill>API: {runtime.apiBaseUrl}</Pill>
        <Pill tone={runtime.pdfPreviewEnabled ? 'success' : 'warning'}>
          document preview {runtime.pdfPreviewEnabled ? 'on' : 'off'}
        </Pill>
      </div>
      <p>
        Users upload PDFs, DOCX files, Markdown, TXT, HTML, JSON, CSV, TSV, RTF,
        or logs. The API parses the file, indexes chunks, and keeps browser-side
        local inference available for privacy-first or demo modes.
      </p>
      <div className="upload-placeholder">
        <span>Drop a document here</span>
        <small>
          POST it to `/v1/documents/upload`, then use `/v1/chat`, `/v1/study-pack`, and
          multi-file compare flows in the API app
        </small>
      </div>
    </div>
  </Card>
);
