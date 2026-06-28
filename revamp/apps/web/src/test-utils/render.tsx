import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  render,
  renderHook,
  type RenderHookResult,
  type RenderResult,
} from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { type ReactElement, type ReactNode } from 'react';

import messages from '@/messages/id-ID.json';

/** A fresh QueryClient with retries off, so failures surface immediately in tests. */
function testQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
}

function Providers({
  client,
  children,
}: {
  client: QueryClient;
  children: ReactNode;
}): JSX.Element {
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="id-ID" messages={messages} timeZone="Asia/Jakarta">
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

/** Render a component tree wrapped in the app's React-Query + next-intl providers. */
export function renderWithProviders(ui: ReactElement): RenderResult {
  const client = testQueryClient();
  return render(<Providers client={client}>{ui}</Providers>);
}

/** Render a hook inside the React-Query provider (for the monitoring data hooks). */
export function renderHookWithProviders<TResult>(
  hook: () => TResult,
): RenderHookResult<TResult, unknown> {
  const client = testQueryClient();
  return renderHook(hook, {
    wrapper: ({ children }) => <Providers client={client}>{children}</Providers>,
  });
}
