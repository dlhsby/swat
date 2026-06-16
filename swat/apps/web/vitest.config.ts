import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // `turbo run test` runs the web/backend/schemas suites concurrently; under
    // that CPU contention jsdom component tests can transiently time out. Higher
    // timeouts + a couple of retries make the combined run deterministic without
    // serializing (isolated runs are unaffected).
    testTimeout: 15000,
    hookTimeout: 15000,
    retry: 2,
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/**/*.ts',
        'src/components/ui/**/*.{ts,tsx}',
        'src/components/monitoring/**/*.{ts,tsx}',
        'src/hooks/use-monitoring*.ts',
      ],
      exclude: [
        'src/lib/**/__tests__/**',
        'src/components/ui/**/__tests__/**',
        'src/components/ui/index.ts',
        'src/components/monitoring/**/__tests__/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
});
