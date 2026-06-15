'use client';

import { useQuery } from '@tanstack/react-query';

import { reportsApi } from '@/lib/reports-api';

/**
 * Polls a report job every 2s until it reaches a terminal state (COMPLETED /
 * FAILED), then stops. Disabled until a jobId exists.
 */
export function useReportJobStatus(jobId: string | null) {
  return useQuery({
    queryKey: ['reports', 'job', jobId],
    queryFn: () => reportsApi.jobStatus(jobId as string),
    enabled: jobId !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'COMPLETED' || status === 'FAILED' ? false : 2000;
    },
  });
}
