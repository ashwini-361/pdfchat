import { getServiceRuntimeConfig } from '@doc-chat/shared';

import { createDemoIngestionReport } from './jobs/ingest-document';

const run = async () => {
  const config = getServiceRuntimeConfig(process.env);
  const report = await createDemoIngestionReport();

  console.log(
    JSON.stringify(
      {
        service: 'worker',
        mode: config.appEnv,
        ollamaBaseUrl: config.ollamaBaseUrl,
        report,
      },
      null,
      2,
    ),
  );
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
