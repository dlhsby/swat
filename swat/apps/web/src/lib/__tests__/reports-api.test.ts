import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '../api-client';
import { reportsApi } from '../reports-api';

vi.mock('../api-client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({ jobId: 'job-1', status: 'QUEUED' }),
  },
}));

describe('reports-api', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POSTs to the per-type generate endpoint with the date range + format', async () => {
    await reportsApi.generate('tonnage', {
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
      format: 'xlsx',
    });
    expect(apiClient.post).toHaveBeenCalledWith('/reports/tonnage/generate', {
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
      format: 'xlsx',
    });
  });

  it('uses the right path per report type', async () => {
    await reportsApi.generate('levy', {
      dateFrom: '2026-01-01',
      dateTo: '2026-02-28',
      format: 'pdf',
    });
    expect(apiClient.post).toHaveBeenCalledWith(
      '/reports/levy/generate',
      expect.objectContaining({ format: 'pdf' }),
    );
  });

  it('polls a job and fetches a download URL', async () => {
    await reportsApi.jobStatus('job-1');
    expect(apiClient.get).toHaveBeenCalledWith('/reports/jobs/job-1');
    await reportsApi.download('job-1');
    expect(apiClient.get).toHaveBeenCalledWith('/reports/download/job-1');
  });
});
