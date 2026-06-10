import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '../api-client';
import {
  addVehicleWasteSource,
  listVehicleWasteSources,
  removeVehicleWasteSource,
} from '../fleet-api';

vi.mock('../api-client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({ message: 'ok' }),
  },
}));

describe('fleet-api vehicle waste-sources', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists the sources linked to a vehicle', async () => {
    await listVehicleWasteSources('00000000-0000-0000-0000-000000000007');
    expect(apiClient.get).toHaveBeenCalledWith(
      '/vehicles/00000000-0000-0000-0000-000000000007/waste-sources',
    );
  });

  it('links a source via POST with the wasteSourceId body', async () => {
    await addVehicleWasteSource(
      '00000000-0000-0000-0000-000000000007',
      '00000000-0000-0000-0000-000000000003',
    );
    expect(apiClient.post).toHaveBeenCalledWith(
      '/vehicles/00000000-0000-0000-0000-000000000007/waste-sources',
      { wasteSourceId: '00000000-0000-0000-0000-000000000003' },
    );
  });

  it('unlinks a source via DELETE on the pair', async () => {
    await removeVehicleWasteSource(
      '00000000-0000-0000-0000-000000000007',
      '00000000-0000-0000-0000-000000000003',
    );
    expect(apiClient.delete).toHaveBeenCalledWith(
      '/vehicles/00000000-0000-0000-0000-000000000007/waste-sources/00000000-0000-0000-0000-000000000003',
    );
  });
});
