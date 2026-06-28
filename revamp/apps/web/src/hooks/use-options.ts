'use client';

import { useMemo } from 'react';

import { type SelectOption } from '@/components/crud/fields';

import { useResourceList } from './use-resource-list';

/**
 * Load a resource list and project it to `{ value, label }` select options.
 * `loader` and `toOption` must be referentially stable (module-level).
 */
export function useOptions<T>(
  loader: () => Promise<T[]>,
  toOption: (row: T) => SelectOption,
): { options: SelectOption[]; loading: boolean } {
  const { rows, loading } = useResourceList(loader);
  const options = useMemo(() => rows.map(toOption), [rows, toOption]);
  return { options, loading };
}
