import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-contained server bundle for the production Docker image (T-165).
  output: 'standalone',
  // Trace from the monorepo root so the standalone bundle resolves pnpm-symlinked
  // workspace deps (@swat/schemas) and the next-intl plugin.
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
  // Transpile the workspace package consumed by the app.
  transpilePackages: ['@swat/schemas'],
};

export default withNextIntl(nextConfig);
