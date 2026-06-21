import { Card, Pill } from '@doc-chat/ui';

import { runtime } from '../lib/runtime';

export const UploadSurface = () => (
  <Card title="Upload and ingestion">
    <div className="stack">
      <div className="badge-row">
        <Pill>API: {runtime.apiBaseUrl}</Pill>
        <Pill tone={runtime.pdfPreviewEnabled ? 'success' : 'warning'}>
          PDF preview {runtime.pdfPreviewEnabled ? 'on' : 'off'}
        </Pill>
      </div>
      <p>
        Users upload a PDF, the API stores it in object storage, and the worker
        turns it into searchable chunks. Browser-side parsing and local inference
        can still be enabled for privacy-first or demo modes.
      </p>
      <div className="upload-placeholder">
        <span>Drop PDF here</span>
        <small>
          or connect this panel to `/v1/documents`, `/v1/study-pack`, and
          multi-file compare flows in the API app
        </small>
      </div>
    </div>
  </Card>
);
