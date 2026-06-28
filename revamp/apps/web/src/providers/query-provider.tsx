'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

/**
 * TanStack Query provider for the authenticated app (Phase 2 monitoring).
 *
 * Dashboards read pre-aggregated, Redis-cached endpoints, so the client cache
 * mirrors that: data stays fresh for 15 minutes (the server cache TTL) and is
 * retained for an hour. The client is created lazily in state so it survives
 * re-renders but is never shared across requests on the server.
 */
export function QueryProvider({ children }: { children: ReactNode }): JSX.Element {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15 * 60 * 1000,
            gcTime: 60 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
