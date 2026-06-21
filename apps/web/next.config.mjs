/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@doc-chat/browser-runtime',
    '@doc-chat/shared',
    '@doc-chat/ui',
  ],
};

export default nextConfig;

