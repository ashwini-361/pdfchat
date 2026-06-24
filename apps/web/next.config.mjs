import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(appDir, '../..');
const transformersBrowserBundle = path.join(
  workspaceRoot,
  'packages/browser-runtime/node_modules/@huggingface/transformers/dist/transformers.web.js',
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@doc-chat/browser-runtime',
    '@doc-chat/shared',
    '@doc-chat/ui',
  ],
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@huggingface/transformers': transformersBrowserBundle,
    };

    return config;
  },
};

export default nextConfig;
