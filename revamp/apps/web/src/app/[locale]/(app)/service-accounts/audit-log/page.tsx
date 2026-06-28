'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { PageHead } from '@/components/shell/page-head';
import { Badge, DataTable } from '@/components/ui';
import { useResourceList } from '@/hooks/use-resource-list';
import { type ApiAuditLogDto, apiAuditApi } from '@/lib/api-audit-api';

/** Colour the HTTP status: 2xx green, 4xx amber, 5xx red. */
function statusVariant(status: number): 'green' | 'amber' | 'red' | 'slate' {
  if (status >= 500) {
    return 'red';
  }
  if (status >= 400) {
    return 'amber';
  }
  if (status >= 200 && status < 300) {
    return 'green';
  }
  return 'slate';
}

export default function ApiAuditLogPage(): JSX.Element {
  const t = useTranslations('nav');
  const { rows, loading, error, reload } = useResourceList<ApiAuditLogDto>(apiAuditApi.list);

  const columns = useMemo<ColumnDef<ApiAuditLogDto, unknown>[]>(
    () => [
      {
        accessorKey: 'timestamp',
        header: 'Waktu',
        meta: { label: 'Waktu' },
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-body-sm text-neutral-600">
            {new Date(row.original.timestamp).toLocaleString('id-ID')}
          </span>
        ),
      },
      {
        accessorKey: 'principalName',
        header: 'Pemanggil',
        meta: { label: 'Pemanggil' },
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.principalName}</span>
            <Badge appearance="count">
              {row.original.principalType === 'SERVICE_ACCOUNT' ? 'Akun Layanan' : 'Pengguna'}
            </Badge>
          </div>
        ),
      },
      {
        id: 'call',
        header: 'Panggilan',
        meta: { label: 'Panggilan' },
        cell: ({ row }) => (
          <span className="font-mono text-body-sm">
            {row.original.method} {row.original.endpoint}
          </span>
        ),
      },
      {
        accessorKey: 'statusCode',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.statusCode)} dot>
            {row.original.statusCode}
          </Badge>
        ),
      },
      {
        accessorKey: 'ipAddress',
        header: 'IP',
        meta: { label: 'IP' },
        cell: ({ row }) => <span className="font-mono text-body-sm">{row.original.ipAddress}</span>,
      },
      {
        accessorKey: 'requestSummary',
        header: 'Ringkasan',
        meta: { label: 'Ringkasan' },
        cell: ({ row }) => (
          <span className="text-body-sm text-neutral-600">
            {row.original.requestSummary ?? '—'}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHead title={t('apiAuditLog')} />
      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        error={error}
        onRetry={() => void reload()}
        onRefresh={() => void reload()}
        refreshing={loading}
        searchPlaceholder="Cari log…"
      />
    </>
  );
}
